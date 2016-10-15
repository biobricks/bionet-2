
// TODO improve this

module.exports = function(password) {
    if(password.length < 8) {
        return "Password must be at least 8 characters long";
    }
    return null;
};
