#!/bin/bash

# This is a bionet live database backup script
# It uses the `bin/db.js dump` command to dump the bionet database to a json file.

# This script will create a time-stamped gzipped JSON-formatted file 
# containing the entire database of the running bionet app.
# Every time this script is run it will check if all previous backups
# take up more than MAX_BACKUP_SIZE megabytes of disk space, and if they do
# then it will delete the oldest backups until this is no longer true.

# This script is meant to be run from a cron job

# Maximum backup size in megabytes
# If total disk usage by all backups take up more than this space
# Then the oldest backups will be deleted until the size is less than MAX_BACKUP_SIZE
MAX_BACKUP_SIZE=100

# Path to bionet app directory
# It's best to use an absolute path
BIONET_PATH=../

# Where to store the backups
DB_BACKUP_PATH="~/backup"

# ---------------------------------------

mkdir -p $DB_BACKUP_PATH

MAX_BACKUP_KBYTES=$(($MAX_BACKUP_SIZE*1024))

DB_BACKUP_FILE="${DB_BACKUP_PATH}/bionet_$(date +%d-%m-%Y_%H-%M-%S).json.gz"

# Run backup
echo "Backing up database to $DB_BACKUP_FILE"
node ${BIONET_PATH}/bin/db.js dump --online | gzip -c -9 > $DB_BACKUP_FILE

if [ $? -ne "0" ]; then
  echo "Database backup failed" >&2
  exit 1
fi

# How many bytes are used by existing backups
DISK_USAGE=$(du -s $DB_BACKUP_PATH | cut -f1);

while [ $DISK_USAGE -gt $MAX_BACKUP_KBYTES ]; do
  TO_DELETE=$(ls -tp $DB_BACKUP_PATH | grep -v '/$' | tail -n 1)  
  echo "Backup dir exceeds $MAX_BACKUP_SIZE MB limit)"
  echo "  Deleting oldest backup: $TO_DELETE"
  rm "${DB_BACKUP_PATH}/$TO_DELETE"
  DISK_USAGE=$(du -s $DB_BACKUP_PATH | cut -f1);
done



