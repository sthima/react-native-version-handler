const util = require('util');
const exec = util.promisify(require('child_process').exec);

const apps = {
  'squadra-app':  {
    project_path: '/Users/joaoschaab/Sthima/squadra-app',
    xcodeproj: 'SquadraApp.xcodeproj',
    target: 'SquadraApp',
  },
}

const validateInput = () => {

  const args = process.argv;
  if (args.length < 5) {
    console.log('usage: release [platform] [environment] [app_name]');
    process.exit(1);
  }

  const platform = args[2];
  const environment = args[3];
  const app_name = args[4];

  if(!['ios', 'android'].includes(platform)) {
    console.log(`Platform : ${platform} not found.`);
    console.log(`Available platforms are: [ios, android]`);
    process.exit(1);
  }

  if(!['production', 'stage'].includes(environment)) {
    console.log(`Environment : ${environment} not found.`);
    console.log(`Available environments are: [production, stage]`);
    process.exit(1);
  }

  if(!apps[app_name]) {
    console.log(`App Name: ${app_name} not found.`);
    console.log(`Available apps are: [${Object.keys(apps)}]`);
    process.exit(1);
  }

  return { 
    platform,
    environment,
    app_name,
    bump_type: 'build',
  };

}



// const increment_build_number = async (input) => {
//   const command = `cd ${apps[input.app_name].path}/${input.platform} && fastlane run increment_build_number`;
//   const { stdout, stderr } = await exec(command);
//   return await get_build_number(input);
// }

// const get_build_number = async (input) => {
//   const command = `cd ${apps[input.app_name].path}/${input.platform} && agvtool what-version -terse`;
//   const { stdout, stderr } = await exec(command);
//   return stdout.replace(/^\s+|\s+$/g, '');
// }

// const get_current_version = async (input) => {
//   const fastlane_command = `fastlane run get_version_number xcodeproj:"${apps[input.app_name].xcodeproj}" target:"${apps[input.app_name].target}"`;
//   const command = `cd ${apps[input.app_name].path}/${input.platform} && ${fastlane_command} | sed -E "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g"`;
//   const { stdout, stderr } = await exec(command);
//   return stdout.split(':').pop().replace(/^\s+|\s+$/g, '').trim();
// }

const push = async (base_command) => {
  const command = `fastlane run push_to_git_remote`;
  const { stdout, stderr } = await exec(base_command + command);
  return stdout;
}

const add_git_tag = async (base_command, tag) => {
  const command = `fastlane run add_git_tag tag:${tag}`;
  const { stdout, stderr } = await exec(base_command + command);
  return stdout;
}

const push_tag = async (base_command, tag) => {
  const command = `fastlane run push_git_tags tag:${tag}`;
  const { stdout, stderr } = await exec(base_command + command);
  return stdout;
}

// const release_ios_staging = async (input) => {

//   console.log(`Bumping build number...`);
//   const new_build_number = await increment_build_number(input);
//   const current_version = await get_current_version(input);
//   const new_stage_version = `${input.environment}-${input.platform}-${current_version}.${new_build_number}`;
//   console.log(`New build number: ${new_build_number}`);

//   console.log('Committing...')
//   await commit(input, new_stage_version);
//   console.log('Finished commit.');

//   console.log('Pushing to origin...');
//   await push(input);
//   console.log('Push finished.');

//   console.log('Adding new tag');
//   await add_git_tag(input, new_stage_version);

//   console.log(`Pushing new tag... -> ${new_stage_version}`);
//   await push_tag(input, new_stage_version);
//   console.log('Push tag finished.');

// }

// const release_android_staging = (input) => {
//   console.log(`Bumping build number...`);
//   const new_build_number = await increment_build_number(input);
// }

// const release_ios = (input) => {
//   switch(input.environment) {
//     case 'stage':
//       release_ios_staging(input);
//       break;
//     case 'production':
//       console.log('production');
//       break;
//   }
// }

// const release_android = (input) => {
//   switch(input.environment) {
//     case 'stage':
//       release_android_staging(input);
//       break;
//     case 'production':
//       console.log('production');
//       break;
//   }
// }

class IosRelease {
  
  constructor(data) {
    this.app_name = data.app_name;
    this.project_path = data.project_path;
    this.xcodeproj = data.xcodeproj;
    this.target = data.target;
    this.environment = data.environment;
    this.bump_type = data.bump_type;
    this.base_command = `cd ${this.project_path}/ios && `;

    console.log(this.app_name);
    console.log(this.project_path);
    console.log(this.xcodeproj);
    console.log(this.target);
    console.log(this.environment);
    console.log(this.bump_type);
    console.log(this.base_command);

  }

  release = () => {
    switch(this.environment) {
      case 'stage':
        this.release_staging();
      break;
      case 'production':
        console.log('production');
      break;
    }
  }

  release_staging = async () => {
    console.log(`Bumping build number...`);
    const new_version = await this.bump();

    console.log(`New version number: ${new_version}`);

    console.log('Committing...')
    await this.commit(new_version);
    console.log('Finished commit.');

    console.log('Pushing to origin...');
    await push(this.base_command);
    console.log('Push finished.');

    console.log('Adding new tag');
    await add_git_tag(this.base_command, new_version);

    console.log(`Pushing new tag... -> ${new_version}`);
    await push_tag(this.base_command, new_version);
    console.log('Push tag finished.');
  }

  bump = async () => {
    switch(this.bump_type) {
      case 'build':
        const build_number = await this.increment_build_number();
        const current_version = await this.get_current_version();
        const new_version = `ios-${this.environment}-${current_version}.${build_number}`;
        return new_version;
      default:
        return null;
    }
  }

  increment_build_number = async () => {
    const command = `fastlane run increment_build_number`;
    const { stdout, stderr } = await exec(this.base_command + command);
    return await this.get_build_number();
  }

  get_build_number = async () => {
    const command = `agvtool what-version -terse`;
    const { stdout, stderr } = await exec(this.base_command + command);
    return stdout.replace(/^\s+|\s+$/g, '');
  }

  get_current_version = async () => {
    const fastlane_command = `fastlane run get_version_number xcodeproj:"${this.xcodeproj}" target:"${this.target}"`;
    const command = `${this.base_command}${fastlane_command} | sed -E "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2})?)?[mGK]//g"`;
    const { stdout, stderr } = await exec(command);
    return stdout.split(':').pop().replace(/^\s+|\s+$/g, '').trim();
  }

  commit = async (build_number) => {
    const commit_message = `Bump ${this.environment} ios version to -> ${build_number}`;
    const commit_command = `fastlane run commit_version_bump message:"${commit_message}" xcodeproj:"${this.xcodeproj}"`;
    const { stdout, stderr } = await exec(this.base_command + commit_command);
    return stdout;
  }

}

const main = () => {
  const input = validateInput();
  const project = apps[input.app_name];

  switch(input.platform) {
    case 'ios':
      const ios_release = new IosRelease({
        ...input,
        ...project,
      })
      ios_release.release();
      break;
    case 'android': 
      // release_android(input);
      break;
  }
}

main();


