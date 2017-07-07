#!/bin/bash

echo "Fetching Selenium"

wget http://selenium-release.storage.googleapis.com/3.4/selenium-server-standalone-3.4.0.jar

echo "Fetching Selenium drivers"
wget https://chromedriver.storage.googleapis.com/2.30/chromedriver_linux64.zip
unzip chromedriver_linux64.zip
rm chromedriver_linux64.zip

echo ""
echo "Done!"
