#!/usr/bin/env node

const util = require("util");
const fs = require("fs");
const strip = require("strip-color");
const arg = require("arg");

const exec = util.promisify(require("child_process").exec);
const homedir = require("os").homedir();
const json_file = `${homedir}/.projects.config.json`;
const apps = JSON.parse(fs.readFileSync(json_file));

const validateInput = () => {
  const args = arg({
    "--tagname": String,
  });

  if (args._.length < 3) {
    console.log(
      "usage: release [platform] [environment] [app_name] <bump_type=patch|minor|major> --tagname=custom_tag_name"
    );
    process.exit(1);
  }

  const platform = args._[0];
  const environment = args._[1];
  const app_name = args._[2];
  const bump_type = args._[3] || "patch";
  const custom_name_tag = args["--tagname"] || "";

  if (!["ios", "android"].includes(platform)) {
    console.log(`Platform : ${platform} not found.`);
    console.log(`Available platforms are: [ios, android]`);
    process.exit(1);
  }

  if (!["production", "stage", "feature"].includes(environment)) {
    console.log(`Environment : ${environment} not found.`);
    console.log(`Available environments are: [production, stage]`);
    process.exit(1);
  }

  if (!apps[app_name]) {
    console.log(`App Name: ${app_name} not found.`);
    console.log(`Available apps are: [${Object.keys(apps)}]`);
    process.exit(1);
  }

  if (args[5] && !["patch", "minor"].includes(args[5])) {
    console.log(`build_type ${args[5]} not implemented`);
    process.exit(1);
  }

  return {
    platform,
    environment,
    app_name,
    bump_type,
    custom_name_tag,
  };
};

const push = async (base_command) => {
  const command = `fastlane run push_to_git_remote`;
  const { stdout, stderr } = await exec(base_command + command);
  return strip(stdout);
};

const add_git_tag = async (base_command, tag) => {
  const command = `fastlane run add_git_tag tag:${tag}`;
  const { stdout, stderr } = await exec(base_command + command);
  return strip(stdout);
};

const push_tag = async (base_command, tag) => {
  const command = `fastlane run push_git_tags tag:${tag}`;
  const { stdout, stderr } = await exec(base_command + command);
  return strip(stdout);
};

class IosRelease {
  constructor(data) {
    this.app_name = data.app_name;
    this.project_path = data.project_path;
    this.xcodeproj = data.xcodeproj;
    this.target = data.target;
    this.environment = data.environment;
    this.bump_type = data.bump_type;
    this.base_command = `cd ${this.project_path}/ios && `;
    this.custom_name_tag = data.custom_name_tag;
  }

  release = () => {
    switch (this.environment) {
      case "stage":
        this.release_staging();
        break;
      case "production":
        this.release_staging();
        break;
    }
  };

  release_staging = async () => {
    try {
      console.log(`Bumping ${this.bump_type} number...`);
      const new_version = await this.bump();

      console.log(`New version number: ${new_version}`);

      console.log("Committing...");
      await this.commit(new_version);
      console.log("Finished commit.");

      console.log("Pushing to origin...");
      await push(this.base_command);
      console.log("Push finished.");

      console.log("Adding new tag");
      await add_git_tag(this.base_command, new_version);

      console.log(`Pushing new tag... -> ${new_version}`);
      await push_tag(this.base_command, new_version);
      console.log("Push tag finished.");
    } catch (e) {
      console.log(e);
      process.exit(1);
    }
  };

  bump = async () => {
    const version_number = await this.increment_version_number();
    return `${this.custom_name_tag || this.environment}-ios-${version_number}`;
  };

  increment_version_number = async () => {
    const command = `fastlane run increment_version_number bump_type:"${this.bump_type}" xcodeproj:"${this.xcodeproj}"`;
    const { stdout, stderr } = await exec(this.base_command + command);
    return await this.get_current_version();
  };

  reset_build_number = async () => {
    const command = `fastlane run increment_build_number build_number:"1"`;
    const { stdout, stderr } = await exec(this.base_command + command);
  };

  increment_build_number = async () => {
    const command = `fastlane run increment_build_number`;
    const { stdout, stderr } = await exec(this.base_command + command);
    return await this.get_build_number();
  };

  get_build_number = async () => {
    const command = `agvtool what-version -terse`;
    const { stdout, stderr } = await exec(this.base_command + command);
    return strip(stdout.replace(/^\s+|\s+$/g, ""));
  };

  get_current_version = async () => {
    const fastlane_command = `fastlane run get_version_number xcodeproj:"${this.xcodeproj}" target:"${this.target}"`;
    const { stdout, stderr } = await exec(
      `${this.base_command}${fastlane_command}`
    );
    // const command = `${this.base_command}${fastlane_command} | sed -E "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g"`;
    // const { stdout, stderr } = await exec(command);
    return strip(
      stdout
        .split(":")
        .pop()
        .replace(/^\s+|\s+$/g, "")
        .trim()
    );
  };

  commit = async (build_number) => {
    const commit_message = `Bump ${this.environment} ios version to -> ${build_number}`;
    const commit_command = `fastlane run commit_version_bump message:"${commit_message}" xcodeproj:"${this.xcodeproj}"`;
    const { stdout, stderr } = await exec(this.base_command + commit_command);
    return strip(stdout);
  };
}

class AndroidRelease {
  constructor(data) {
    this.app_name = data.app_name;
    this.project_path = data.project_path;
    this.environment = data.environment;
    this.bump_type = data.bump_type;
    this.base_command = `cd ${this.project_path}/android && `;
    this.custom_name_tag = data.custom_name_tag;
  }

  release = () => {
    switch (this.environment) {
      case "stage":
        this.release_staging();
        break;
      case "production":
        this.release_staging();
        break;
    }
  };

  release_staging = async () => {
    try {
      console.log(`Bumping build number...`);
      const new_version = await this.bump();
      console.log(`New version number: ${new_version}`);

      console.log("Committing...");
      await this.commit(new_version);
      console.log("Finished commit.");

      console.log("Pushing to origin...");
      await push(this.base_command);
      console.log("Push finished.");

      console.log("Adding new tag");
      await add_git_tag(this.base_command, new_version);

      console.log(`Pushing new tag... -> ${new_version}`);
      await push_tag(this.base_command, new_version);
      console.log("Push tag finished.");
    } catch (e) {
      console.log(e);
      process.exit(1);
    }
  };

  bump = async () => {
    const build_number = await this.increment_build_number();
    const current_version = await this.increment_version_name();
    return `${
      this.custom_name_tag || this.environment
    }-android-${current_version}`;
  };

  increment_version_name = async () => {
    const current_version_name = await this.get_current_version();
    const numbers = current_version_name.split(".");
    if (numbers.length < 3) {
      console.log("Current android version name not supported.");
      console.log("Supported format: %d.%d.%d");
      process.exit(1);
    }

    const major = numbers[0];
    const minor = numbers[1];
    const patch = numbers[2];

    let new_version_name = "";

    if (this.bump_type === "patch") {
      new_version_name = `${major}.${minor}.${parseInt(patch, 10) + 1}`;
    } else if (this.bump_type === "minor") {
      new_version_name = `${major}.${parseInt(minor, 10) + 1}.0`;
    } else if (this.bump_type === "major") {
      new_version_name = `${parseInt(major, 10) + 1}.${minor}.${patch}`;
    }

    const fastlane_command = `fastlane run android_set_version_name version_name:"${new_version_name}"`;
    const { stdout, stderr } = await exec(this.base_command + fastlane_command);
    return new_version_name;
  };

  increment_build_number = async () => {
    const command = `fastlane run increment_version_code`;
    const { stdout, stderr } = await exec(this.base_command + command);
    return await this.get_build_number();
  };

  get_build_number = async () => {
    const command = `fastlane run get_version_code | sed -E "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g"`;
    const { stdout, stderr } = await exec(this.base_command + command);
    return strip(
      stdout
        .split(":")
        .pop()
        .replace(/^\s+|\s+$/g, "")
        .trim()
    );
  };

  get_current_version = async () => {
    const fastlane_command = `fastlane run get_version_name`;
    const command = `${this.base_command}${fastlane_command} | sed -E "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g"`;
    const { stdout, stderr } = await exec(command);
    return strip(
      stdout
        .split(":")
        .pop()
        .replace(/^\s+|\s+$/g, "")
        .trim()
    );
  };

  commit = async (build_number) => {
    const commit_message = `Bump ${this.environment} android version to -> ${build_number}`;
    // const commit_command = `fastlane run commit_android_version_bump message:"${commit_message}" gradle_file_folder: "${this.project_path}/android/app"`;
    const git_add = `git add ./app/build.gradle`;
    await exec(this.base_command + git_add);
    const commit_command = `git commit -m "${commit_message}"`;
    const { stdout, stderr } = await exec(this.base_command + commit_command);
    return strip(stdout);
  };
}

const main = async () => {
  const input = validateInput();
  const project = apps[input.app_name];

  switch (input.platform) {
    case "ios":
      const ios_release = new IosRelease({
        ...input,
        ...project,
      });
      ios_release.release();
      break;
    case "android":
      const android_release = new AndroidRelease({
        ...input,
        ...project,
      });
      android_release.release();
      break;
  }
};

main();
