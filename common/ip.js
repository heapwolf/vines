var os = require('os');

//
// get the external address of the machine on which the
// process is running.
//
exports.externalAddress = function externalAddress () {

  var interfaces = os.networkInterfaces();
  var IPv4, IPv6;

  interfaces && Object.keys(interfaces).forEach(function(i) {

    //
    // The first available physical interface is preferred,
    // if one is not accessible than we will attempt to get
    // the first virtual/logical interface that is available.
    // 
    // Tested on Mac OSX, Fedora 15, Ubuntu 11.04
    //
    //
    // ent0
    // The notation ent0 is used to specify the hardware 
    // adapter. It has nothing to do with the TCP/IP address.
    //
    // en0 represents the interface associated with hardware 
    // adapter ent0. The notation en0 is used for Standard 
    // Ethernet(inet). The TCP/IP address is associated with this 
    // interface.
    //
    // et0 represents the interface associated with hardware 
    // adapter ent0. The notation et0 is used for IEEE 802.3 
    // Ethernet(inet). If you are using standard ethernet 
    // protocol then it will not have TCP/IP address.
    //
    // on linux the eqv on ent, en and et seems to be eth
    // the trailing integer generally represents the known 
    // interfaces. 
    //
    if (i[0] === 'e') {
      interfaces[i].forEach(function(ifconfig) {
        if (ifconfig.internal === false) {
          if (ifconfig.family === 'IPv4') {
            IPv4 = ifconfig.address;
          }
          if (ifconfig.family === 'IPv6') {
            IPv6 = ifconfig.address;
          }
        }
      });
    }

  });
  return IPv4 || IPv6 || '127.0.0.1';
};
