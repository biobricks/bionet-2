
module.exports = function(opts, base_url) {
  
  this.opts = opts || {};
  this.mailer = null;

  if(!this.opts.from_address) {
    throw new Error("settings.mailer.from_address must be set");
  }

  if(opts.type == 'direct') {
    this.mailer = require('nodemailer').createTransport();
  } else if(opts.type == 'smtp') {
    var smtpTransport = require('nodemailer-smtp-transport');
    this.mailer = require('nodemailer').createTransport(smtpTransport({
      host: opts.host || "localhost",
      port: opts.port || 25,
      ignoreTLS: !opts.tls
    }));
  } else { // console output only
    this.mailer = {
      sendMail: function(data, cb) {
        console.log("Not actually sending email:");
        console.log("  From: " + data.from);
        console.log("  To: " + data.to);
        console.log("  Subject: " + data.subject);
        console.log("  Content: \n" + (data.html || data.text));
        cb(null, null);
      }
    }
  }
  
  // send an email
  this.send = function(data, cb) {
    if(!data.subject || (!data.text && !data.html) || !data.to) {
      return cb("Attempting to send email with missing .subject, (.text or .html) or .to");
    }
    var subject = (this.opts.subjectPrefix) ? this.opts.subjectPrefix + ' ' + data.subject : data.subject;
    this.mailer.sendMail({
      from: this.opts.from_address,
      to: data.to,
      subject: subject,
      text: data.text,
      html: data.html
    }, function(err, info) {
      if(err) return cb(err);
      return cb(null, info);
    });        
  };

  this.sendVerification = function(user, code, cb) {
    if(!user || !user.email || !code) {
      return cb("Cannot send email verification email: Missing user, user.email or verification code");
    }

    this.send({
      to: user.email,
      subject: "Verify your account",
      text: "Welcome to the bionet!\n\nTo verify your email please visit this URL: \n\n" + base_url+'/verify-email/'+code + "\n\n"
    }, function(err, info) {
      if(err) return cb(err);
      return cb(null, info);
    });
  };

  this.sendMaterialRequest = function(m, requesterEmail, physicalAddress, cb) {
    if(!m || !m.name) {
      return cb("Cannot send email verification email: Missing material or material name");
    }

    // TODO validate requesterEmail
    var txt = "You have received a request for materials from "+requesterEmail+"\n\nThe material request is for: "+m.name+"\n\n"+"Inventory location: "+base_url+"/inventory/"+m.id+"\n\nShipping address:\n\n";

    var i;
    for(i=0; i < physicalAddress.length; i++) {
      txt += "  "+physicalAddress[i]+"\n"
    }

    txt += "\n\n";

    console.log("PPPPPPPPPPP", opts);

    this.send({
      to: opts.requestFulfillerEmail,
      subject: "Material request",
      text: txt
    }, function(err, info) {
      if(err) return cb(err);
      return cb(null, info);
    });
  };


  this.sendPasswordReset = function(user, code, cb) {
    if(!user || !user.email || !code) {
      return cb("Cannot send password reset email: Missing user, user.email or reset code");
    }
    
    this.send({
      to: user.email,
      subject: "Password reset request",
      text: "A password reset has been requested.\n\nTo reset your password please visit this link: \n\n" + base_url+'/password-reset/'+code + "\n\n"
    }, function(err, info) {
      if(err) return cb(err);
      return cb();
    });
    
  };
  
};
