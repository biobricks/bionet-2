#!/bin/bash

script_path="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

usage() {
  if [ -z "$1" ]; then
    out="/dev/stderr"
  else
    out="/dev/stdout"
  fi

  echo "" > $out
  echo "Usage: $0 [git_branch]" > $out
  echo "" > $out
  echo "  Update bionet to latest version from git." > $out
  echo "  Updates software, installs dependencies and runs migrations."
  echo "  Pulls from the main branch if branch is not specified." > $out
  echo "" > $out
}

if [ $# -eq "0" ]; then
  branch="master"
elif [ "$#" -eq "1" ]; then
  branch="$1"
else
  usage
fi

echo "Pulling latest version of branch '$branch'"
git checkout $branch
if [ $? -ne "0" ]; then
  echo "git checkout failed" > /dev/stderr
  exit 1
fi

git pull 
if [ $? -ne "0" ]; then
  echo "git pull failed" > /dev/stderr
  exit 1
fi

echo "Installing dependencies"
npm install
if [ $? -ne "0" ]; then
  echo "npm install failed" > /dev/stderr
  exit 1
fi

echo "Running migrations"
${script_path}/../bin/migrate.js
if [ $? -ne "0" ]; then
  echo "bin/migrate.js failed" > /dev/stderr
  exit 1
fi

version=$(git rev-parse HEAD)

echo "Successfully updated to branch '$branch' version $version"
