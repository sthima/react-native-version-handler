# react-native-version-handler

Bump, commit, push and create tags for your react-native (android/ios) project.

## setup

### Create a file ".projects.config.json" in your home. Configure the projects that you want to use with this script. 
Example:
```
{
  "squadra-app":  {
    "project_path": "/Users/joaoschaab/Sthima/squadra-app",
    "xcodeproj": "SquadraApp.xcodeproj",
    "target": "SquadraApp"
  }
}
```

### Installing fastlane

This project uses *fastlane* to increment build version, so you will have to install it in your project.

Install the latest Xcode command line tools:

```xcode-select --install```

####  Install fastlane using RubyGems
```sudo gem install fastlane -NV```

#### Alternatively using Homebrew
```brew install fastlane```


### setup fastlane ios

```cd your_project/ios && fastlane init``` 

### setup fastlane android

```cd your_project/android && fastlane init```

```
#After that, add the following plugins:
fastlane add_plugin fastlane-plugin-increment_version_code
fastlane add_plugin fastlane-plugin-get_version_code
fastlane add_plugin fastlane-plugin-get_version_name
fastlane add_plugin fastlane-plugin-commit_android_version_bump
fastlane add_plugin fastlane-plugin-versioning_android

```

## install

```
npm install -g react-native-version-handler
```

## running
```
usage: release [platform] [environment] [app_name] <bump_type=minor|patch>
```

Example
```
release ios stage squadra-app minor
```
