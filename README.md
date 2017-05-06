This is a work in progress. Don't expect anything to work.

# Downloading

```
sudo aptitude install git # if you don't already have git installed
git clone git@gitlab.com:biobricks/bionet.git
```

# Installing pre-requisites

TODO instructions for install latest stable node using nvm (and for root as well)

```
# install nvm
wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.31.0/install.sh | bash
# install node
nvm install v4.4.2

# install node packages
cd bionet/
npm install
```

## ElasticSearch

ElasticSearch is required if you want human language search (fuzzy matching). If ElasticSearch is not present on your system then only search results exactly matching your query will work (though case and whitespace is ignored).

Follow (this guide)[https://www.elastic.co/guide/en/elasticsearch/reference/current/setup-repositories.html] to install from the official repository so you'll get security updates.

## BLAST+

BLAST+ is required if you want to be able to run BLAST queries on DNA, RNA or Amino Acid sequences. As with ElasticSearch only exact matching is possible if BLAST is not installed.

For debian/ubuntu based systems:

```
sudo apt install ncbi-blast+
```

or you can find the latest version (on the NCBI ftp server)[ftp://ftp.ncbi.nlm.nih.gov/blast/executables/blast+/LATEST/].

# Configuring

```
cp settings.js.example settings.js 

# TODO currently non-existant
#cp www/settings.js.example www/settings.js
```

Then edit each of the settings.js files to suit your needs.

# Generate key pair for print/scan server

```
cd print_host_keys/
ssh-keygen -t rsa -f myhostkey -N ""
cd ../
```

and copy the ssh public key for the client to `print_client_keys/mykey.pub`.

# Building

To build once:

```
npm run build
```

To continuously build every time files are changed (useful if you're actively developing), open a new terminal and run:

```
npm run watchify
```

# Running

```
npm start
```

# CSS and less

The bionet uses [less](http://lesscss.org/) but you can of course also use plain CSS. To add less or css just add .less or .css files into:

```
www/css/
```

All of these files will be bundled into `static/bundle.css`.

Note that the content of each .less files will be wrapped in a css class based on the filename of the .less file. The files basename without the file extension will be used but all strings of characters that are not in the set A-z or 0-9 or - or _ will be transformed to a signgle - (dash) character e.g:

```
# The contents of the file:
foo\ bar..baz.less

# Will be wrapped in the class
.foo-bar-baz
```

Plain CSS files will not be wrapped like this (because nested rules aren't supported by CSS) and if you want to avoid this wrapping for .less files, then end the filename in `.global.less` 

# Production 

Here are some notes for setting up the bionet for production use.

## Web app


## label-printer client

You should install the label-printer client on a computer with internet access which is hooked up via USB to the physical label printer (e.g. Brother QL-570). We recommend using a small single-board computer like the Beagle Bone Black, which you can then physicalle attach to the label-printer (hot glue works) to ensure they take up minimal space and stay together.

For instructions see the README.md for [bionet-labelprinter](https://github.com/biobricks/bionet-labelprinter)

## SSH reverse tunnel

Since it is likely that the printer client will be running on a network where it will not have its own IP or port that's accessible from the outside it's useful to set up an auto-establishing ssh reverse tunnel. You will need a server that is world-accessible via ssh and on which you have root access. 

On the server you will need to add the following to /etc/ssh/sshd_config

```
Match User bionet-tunnel
   AllowTcpForwarding yes
   X11Forwarding no
   PermitTunnel no
   GatewayPorts yes # Allow users to bind tunnels on non-local interfaces
   AllowAgentForwarding no
   PermitOpen localhost:2222 myserver.example.com:2222 # Change this line!
   ForceCommand echo 'This account is restricted for ssh reverse tunnel use'
```

Where you replace myserver.example.com with the public hostname or public IP of the server on which you are editing this file.

Then run:

```
sudo /etc/init.d/ssh restart
```

Create a user for the tunnel on the server:

```
adduser \
  --disabled-password \
  --shell /bin/false \
  --gecos "user for bionet printer client ssh tunnel" \
  bionet-tunnel
```

On the computer running the bionet label-printer client, log in as the user running the printer client app and generate an ssh key:

```
ssh-keygen -t rsa
```

Hit enter to accept the default when it asks you for the key location. Now open the public key file:

```
less ~/.ssh/id_rsa.pub
```

and copy the contents into your copy-paste buffer.

On the server, create the .ssh directory and authorized keys file. Set permissions and open the file in an editor. Then paste the public key into the file and close and save.

```
cd /home/bionet-tunnel
mkdir .ssh
touch .ssh/authorized_keys
chmod 700 .ssh
chmod 600 .ssh/authorized_keys
chown -R bionet-tunnel.bionet-tunnel .ssh
nano .ssh/authorized_keys
# paste in the public key, hit ctrl+x then y, then enter to save
```

Now from the computer running the bionet label-printer client, as the user running the label-printer client software, try to ssh to the server:

```
ssh -N bionet-tunnel@myserver.example.com
```

If it asks for a password something went wrong. If it just sits there forever, apparently doing nothing, then everything is working as expected.

Now try to create a tunnel:

```
ssh bionet-tunnel@myserver.example.com -N -R myserver.example.com:2222:localhost:22 
```

while that is running, from e.g. your laptop try to connect to the label-printer client computer via the reverse tunnel:

```
ssh -p 2222 bionet@myserver.example.com
```

You should get a password prompt (or a shell if you have pubkey authentication set up).

If this works you can set up autossh to make the label-printer client auto-establish the tunnel on boot and auto-re-establish this tunnel every time it fails.

Assuming you're root on the label-printer client computer, first install autossh:

```
apt-get install autossh
```

Then copy production/autossh_loop from this directory to /usr/local/bin/autossh_loop on the label-printer client computer and make it executable with:

```
chmod 755 /usr/local/bin/autossh_loop
```

Copy production/autossh.service to /etc/systemd/system/autossh.service and edit the file changing all occurrences of `myserver.example.com` to the hostname of your server and changing the `User=bionet` line to the user that you granted access to the server. 

Save the file and run:

```
systemctl daemon-reload
service autossh start
```

Your tunnel should now be establish and will re-establish on reboot or failure.

# Backups

You can dump the entire database of the running bionet app to a JSON file using:

```
./bin/db.js dump > ./myfile.json
```

It is recommended to run this e.g. every hour using a cron job such that other backup systems that image the entire filesystem won't end up with a copy of the database that is in an inconsistant state (if for example the filesystem was copied during a large batch write to the database). 

A database backup script suitable for calling from cron is included here:

```
production/db_backup.sh
```

You will need to tweak the `MAX_BACKUP_SIZE`, `BIONET_PATH` and `DB_BACKUP_PATH` at the beginning of the script.

You can restore from a backup by first deleting the old database (obviously be careful) using `rm -rf bionet/db` and then running:

```
./bin/db.js import ./myfile.json
```

# ToDo

## Build system

* Add font inlining
* Switch to gulp?


# Notes

Username restrictions:

* No @ symbols
=======
# bionet-private
>>>>>>> e1b2796755d4c0ef184c33c643dc192fdb31eeb0
