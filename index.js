const btcmessage = require('bitcoinjs-message');
const qs = require('qs');
const axios = require('axios');
const zeltrezjs = require('zeltrezjs');
const os = require('os');
const fs = require('fs')

const address = '';
const privateKey = '';

let logins = {};

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getIPaddresses() {
  try {
    const ips = [];
    const ip = '62.171.163.150';
    const detZelNodes = await axios.get(`http://${ip}:16127/zelcash/viewdeterministiczelnodelist`);
    if (detZelNodes.data.status === 'success') {
      const data = detZelNodes.data.data;
      data.forEach((zelnode) => {
        if (zelnode.ip != '') {
          ips.push(zelnode.ip);
        }
      });
      return ips;
    } else {
      throw detZelNodes.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}
// return signature of a given message providing a private key
async function signMessage(message, privKey) {
  if (privKey.length !== 64) {
    privKey = zeltrezjs.address.WIFToPrivKey(privKey);
  }
  const pk = Buffer.from(privKey, "hex");
  const mysignature = btcmessage.sign(message, pk, true);
  return mysignature.toString("base64");
}

function loadLogins() {
  const platform = os.platform();
  let loginsFile = null;

  if (platform === "linux" || platform === "darwin") {
    loginsFile = `${os.homedir()}/ZelFlux/logins.json`;
  } else if (platform === "win32") {
    loginsFile = `${os.homedir()}\\ZelFlux\\logins.json`;
  }

  if (fs.existsSync(loginsFile)) {
    let data = "";
    const stream = fs.createReadStream(loginsFile);
    stream.on("data", (chunk) => {
      data += chunk;
    })
      .on("end", () => {
        logins = JSON.parse(data);
      });
  }
}

function saveLogins(logins) {
  const platform = os.platform();
  let loginsFile = null;

  if (platform === "linux" || platform === "darwin") {
    loginsFile = `${os.homedir()}/ZelFlux/logins.json`;
  } else if (platform === "win32") {
    loginsFile = `${os.homedir()}\\ZelFlux\\logins.json`;
  }

  const stream = fs.createWriteStream(loginsFile);

  stream.once("open", () => {
    stream.write(JSON.stringify(logins));
    stream.end();
  });
}

// given an ip address return stored authHeader
async function getAuthHeader(ip) {
  return logins[ip];
}

// returns login phrase of zelnode
async function getLoginPhrase(ip) {
  try {
    const loginPhraseResponse = await axios.get(`http://${ip}:16127/zelid/loginphrase`);
    if (loginPhraseResponse.data.status === 'success') {
      return loginPhraseResponse.data.data;
    } else {
      throw loginPhraseResponse.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}

// returns number of minor flux version
async function getFluxVersion(ip) {
  try {
    const axiosConfig = {
      timeout: 3456,
    };
    const loginPhraseResponse = await axios.get(`http://${ip}:16127/zelflux/version`, axiosConfig);
    if (loginPhraseResponse.data.status === 'success') {
      return Number(loginPhraseResponse.data.data.split('.')[1]);
    } else {
      throw loginPhraseResponse.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}

async function getFluxScannedHeight(ip) {
  try {
    const scannedHeightResponse = await axios.get(`http://${ip}:16127/explorer/scannedheight`);
    if (scannedHeightResponse.data.status === 'success') {
      return Number(scannedHeightResponse.data.data.generalScannedHeight);
    } else {
      throw scannedHeightResponse.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}

async function getBalance(ip, address) {
  try {
    const balanceResponse = await axios.get(`http://${ip}:16127/explorer/balance/${address}`);
    if (balanceResponse.data.status === 'success') {
      return Number(balanceResponse.data.data);
    } else {
      throw balanceResponse.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}

// returns number of scannedheight
async function getZelBenchVersion(ip) {
  try {
    const loginPhraseResponse = await axios.get(`http://${ip}:16127/zelbench/getinfo`);
    if (loginPhraseResponse.data.status === 'success') {
      return Number(loginPhraseResponse.data.data.version.split('.').join(''));
    } else {
      return 'BAD';
    }
  } catch (error) {
    return 'BAD';
  }
}

// returns number of scannedheight
async function isAllOnNodeOK(ip) {
  try {
    const zelbenchStatus = await axios.get(`http://${ip}:16127/zelbench/getstatus`);
    if (zelbenchStatus.data.status === 'success') {
      if (zelbenchStatus.data.data.status === 'online' && zelbenchStatus.data.data.zelback === 'connected') {
        if (zelbenchStatus.data.data.benchmarking === 'toaster' || zelbenchStatus.data.data.benchmarking === 'failed') {
          return 'BAD';
        } else {
          return 'OK';
        }
      } else {
        return 'BAD';
      }
    } else {
      return 'BAD';
    }
  } catch (error) {
    return 'BAD';
  }
}


// returns number of scannedheight
async function getScannedHeight(ip) {
  try {
    const loginPhraseResponse = await axios.get(`http://${ip}:16127/explorer/scannedheight`);
    if (loginPhraseResponse.data.status === 'success') {
      return loginPhraseResponse.data.data.generalScannedHeight;
    } else {
      throw loginPhraseResponse.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}

async function zelcashPing(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    console.log(authHeader);
    const zelidauthHeader = authHeader;
    console.log(zelidauthHeader);
    const restartResponse = await axios.get(`http://${ip}:16127/zelcash/ping`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
    });
    if (restartResponse.data.status === 'success') {
      console.log(ip + ': ' + restartResponse.data.data);
    } else {
      throw restartResponse.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}

async function restartNodeBenchmarks(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const restartResponse = await axios.get(`http://${ip}:16127/zelbench/restartnodebenchmarks`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
    });
    if (restartResponse.data.status === 'success') {
      return restartResponse.data.data;
    } else {
      throw restartResponse.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}

async function restartDaemon(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const restartResponse = await axios.get(`http://${ip}:16127/zelcash/restart`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
    });
    console.log(restartResponse);
    if (restartResponse.data.status === 'success') {
      console.log(ip + ': ' + restartResponse.data.data);
      return 'OK';
    } else {
      throw restartResponse.data.data;
    }
  } catch (error) {
    return 'OK2';
  }
}

async function restartExplorerSync(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const restartResponse = await axios.get(`http://${ip}:16127/explorer/restart`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
    });
    console.log(restartResponse);
    if (restartResponse.data.status === 'success') {
      return restartResponse.data.data;
    } else {
      throw restartResponse.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}

async function stopExplorerSync(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const restartResponse = await axios.get(`http://${ip}:16127/explorer/stop`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
    });
    console.log(restartResponse);
    if (restartResponse.data.status === 'success') {
      return restartResponse.data.data;
    } else {
      throw restartResponse.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}

async function updateZelBench(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const updateResponse = await axios.get(`http://${ip}:16127/zelnode/updatezelbench`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
    });
    console.log(updateResponse);
    if (updateResponse.data.status === 'success') {
      return 'OK';
    } else {
      throw updateResponse.data.data;
    }
  } catch (error) {
    return 'OK2';
  }
}

async function updateZelBenchFast(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    axios.get(`http://${ip}:16127/zelnode/updatezelbench`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
    });
  } catch (error) {
    return 'OK2';
  }
}

async function updateZelCash(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const updateResponse = await axios.get(`http://${ip}:16127/zelnode/updatezelcash`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
    });
    console.log(updateResponse);
    if (updateResponse.data.status === 'success') {
      return 'OK';
    } else {
      throw updateResponse.data.data;
    }
  } catch (error) {
    return 'OK2';
  }
}

async function updateZelFlux(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const updateResponse = await axios.get(`http://${ip}:16127/zelnode/updatezelflux`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
    });
    if (updateResponse.data.status === 'success') {
      return 'OK';
    } else {
      throw updateResponse.data.data;
    }
  } catch (error) {
    return 'OK2';
  }
}

async function getZelFluxErrorLog(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const updateResponse = await axios.get(`http://${ip}:16127/zelnode/zelfluxerrorlog`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
    });
    console.log(updateResponse);
    if (updateResponse.data.status === 'success') {
      return 'OK';
    } else {
      throw updateResponse.data.data;
    }
  } catch (error) {
    return 'OK2';
  }
}

async function updateZelFluxTheHardWay(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const updateResponse = await axios.get(`http://${ip}:16127/zelnode/hardupdatezelflux`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
    });
    console.log(updateResponse);
    if (updateResponse.data.status === 'success') {
      return 'OK';
    } else {
      throw updateResponse.data.data;
    }
  } catch (error) {
    return 'OK2';
  }
}

// post login
async function login(ip) {
  try {
    const loginPhrase = await getLoginPhrase(ip);
    const signature = await signMessage(loginPhrase, privateKey);
    const zelidauth = {
      zelid: address,
      signature,
      loginPhrase,
    };
    const verifyLogin = await axios.post(`http://${ip}:16127/zelid/verifylogin`, qs.stringify(zelidauth));
    if (verifyLogin.data.status === 'success') {
      console.log(`Login to ${ip} success.`);
      const login = qs.stringify(zelidauth);
      logins[ip] = login;
      console.log(login);
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log(error);
    return false;
  }
}

async function massLogin() {
  const ipsObtained = await getIPaddresses();
  let i = 1;
  if (ipsObtained.length > 0) {
    setTimeout(async () => {
      for (const ip of ipsObtained) {
        if (!logins[ip]) {
          const loggedIn = await login(ip);
          console.log(i + ' ' + ip + ': ' + loggedIn);
        } else {
          console.log(i + ' ' + ip + ': already logged in.');
        }
        i++;
      }
      setTimeout(() => {
        saveLogins(logins);
      }, 1000);
    }, 2000);
  }
}

async function massAskFluxVersion() {
  loadLogins();
  let i = 1;
  let j = 0;
  setTimeout(async () => {
    const ips = Object.keys(logins)
    const totalNodes = ips.length;
    console.log(totalNodes);
    for (const ip of ips) {
      const fluxVersion = await getFluxVersion(ip);
      console.log(i + ' ' + ip + ': ' + fluxVersion);
      i++;
      if (fluxVersion < 58) {
        j++
      }
      console.log("Nodes to update: " + j)
    }
  }, 2000);
}

async function massFluxUpdate() {
  loadLogins();
  let i = 1;
  setTimeout(async () => {
    const ips = Object.keys(logins)
    const totalNodes = ips.length;
    console.log(totalNodes);
    for (const ip of ips) {
      const fluxVersion = await getFluxVersion(ip);
      console.log('Flux version on ' + i + ' ' + ip + ': v' + fluxVersion);
      i++;
      if (fluxVersion < 58) {
        const updateResponse = await updateZelFlux(ip);
        console.log('Updating Flux on ' + ip + ': ' + updateResponse);
      }
    }
  }, 2000);
}

async function massHardFluxUpdate() {
  loadLogins();
  let i = 1;
  setTimeout(async () => {
    const ips = [
      '193.188.15.241',
      '167.86.71.144',
      '5.189.182.226',
    ]
    const totalNodes = ips.length;
    console.log(totalNodes);
    for (const ip of ips) {
      const fluxVersion = await getFluxVersion(ip);
      console.log('Flux version on ' + i + ' ' + ip + ': v' + fluxVersion);
      i++;
      if (fluxVersion < 58) {
        const updateResponse = await updateZelFluxTheHardWay(ip);
        console.log('Updating Flux on ' + ip + ': ' + updateResponse);
      }
    }
  }, 2000);
}

async function getBadFLuxVersions() {
  const ipsObtained = await getIPaddresses();
  let badFluxes = [];
  let unreachableFluxes = [];
  let i = 1;
  if (ipsObtained.length > 0) {
    setTimeout(async () => {
      for (const ip of ipsObtained) {
        const fluxVersion = await getFluxVersion(ip);
        if (fluxVersion < 58) {
          badFluxes.push(ip);
          console.log(ip + ' IS A NOT CORRECT');
        } else if (!fluxVersion) {
          unreachableFluxes.push(ip);
          console.log(ip + ' IS ureachable');
        } else {
          console.log(i + ' ' + ip + ' v' + fluxVersion);
        }
        i++;
      }
      setTimeout(() => {
        console.log(badFluxes);
        console.log(unreachableFluxes);
      }, 1000);
    }, 2000);
  }
}

async function massZelBenchUpdate() {
  loadLogins();
  let i = 1;
  setTimeout(async () => {
    const ipsAll = Object.keys(logins)
    const totalNodes = ipsAll.length;
    const ips = ipsAll.slice(0, 4);
    console.log(totalNodes);
    for (const ip of ips) {
      const fluxVersion = await getFluxVersion(ip);
      // console.log('Flux version on ' + i + ' ' + ip + ': v' + fluxVersion);
      i++;
      if (fluxVersion >= 57) {
        const zelbenchVersion = await getZelBenchVersion(ip);
        if (zelbenchVersion < 110) {
          console.log('Updating ' + ip);
          const updateZB = await updateZelBench(ip);
          if (updateZB === 'OK' || updateZB == 'OK2') {
            await timeout(180000);
            const zelbenchVersion2 = await getZelBenchVersion(ip);
            console.log(zelbenchVersion2);
            if (zelbenchVersion2 === 'BAD') {
              // restart zelcash
              console.log('Something went wrong on ' + ip + ' Restarting daemon.')
              const restartZelcash = await restartDaemon(ip);
              if (restartZelcash == 'OK' || restartZelcash == 'OK2') {
                await timeout(180000);
                const zelbenchVersion3 = await getZelBenchVersion(ip);
                if (zelbenchVersion3 >= 110) {
                  console.log('Update on ' + ip + ' was succesful. Restarting benchmarks.')
                  await timeout(180000);
                  await restartNodeBenchmarks(ip);
                } else {
                  console.log('Failed to update ip ' + ip);
                }
              } else {
                console.log('Critical error on ' + ip);
              }
            } else if (zelbenchVersion2 >= 110) {
              console.log('Update on ' + ip + ' was succesful.');
              const isOK = await isAllOnNodeOK(ip);
              if (isOK == 'BAD') {
                console.log('Update on ' + ip + ' RERUNNING BENCHMARKING NOTED.');
                await timeout(120000);
                await restartNodeBenchmarks(ip);
              } else {
                console.log('Update on ' + ip + ' BENCH test OK.');
              }
            } else {
              console.log('Failed to update node ' + ip);
            }
          } else {
            console.log('Bad stuff happened while running updateZelBench' + ip);
          }
        }
      }
    }
  }, 2000);
}

async function massZelBenchUpdate2() {
  loadLogins();
  let i = 1;
  setTimeout(async () => {
    const ipsAll = ['173.249.42.126', '95.217.0.148', '95.216.200.95', '86.252.37.74', '77.37.224.231'];//Object.keys(logins)
    const totalNodes = ipsAll.length;
    const ips = ipsAll;
    console.log(totalNodes);
    for (const ip of ips) {
      const fluxVersion = await getFluxVersion(ip);
      // console.log('Flux version on ' + i + ' ' + ip + ': v' + fluxVersion);
      i++;
      if (fluxVersion >= 57) {
        const zelbenchVersion = await getZelBenchVersion(ip);
        console.log(i);
        if (zelbenchVersion < 110) {
          console.log('Updating ' + ip);
          updateZelBenchFast(ip);
        }
      }
    }
  }, 2000);
}

async function massZelBenchCheck() {
  loadLogins();
  let i = 0;
  setTimeout(async () => {
    const ipsAll = Object.keys(logins)
    const totalNodes = ipsAll.length;
    const ips = ipsAll;
    console.log(totalNodes);
    for (const ip of ips) {
      const fluxVersion = await getFluxVersion(ip);
      // console.log('Flux version on ' + i + ' ' + ip + ': v' + fluxVersion);
      i++;
      if (fluxVersion >= 57) {
        const zelbenchVersion = await getZelBenchVersion(ip);
        if (zelbenchVersion >= 110) {
          const isOK = await isAllOnNodeOK(ip);
          if (isOK == 'BAD') {
            console.log(i + ' Update on ' + ip + ' RERUNNING BENCHMARKING.');
            //await restartNodeBenchmarks(ip);
          } else {
            console.log(i + ' Update on ' + ip + ' BENCH test OK.');
          }
        } else if (zelbenchVersion < 110) {
          console.log(i + ' Update on ' + ip + ' FAILED');
        } else {
          console.log(i + ' Update on ' + ip + ' ERROR');
          // errored, restart daemon
          // restartDaemon(ip);
        }
      }
    }
  }, 2000);
}

async function getBadFluxScannedHeights() {
  const ipsObtained = await getIPaddresses();
  let badFluxes = [];
  let badFluxBalance = [];
  let i = 1;
  if (ipsObtained.length > 0) {
    setTimeout(async () => {
      for (const ip of ipsObtained) {
        const height = await getFluxScannedHeight(ip);
        if (height < 576113) {
          badFluxes.push(ip);
          console.log(ip + ' IS A NOT SYNCED');
        } else {
          console.log(i + ' ' + ip + ' ' + height);
          const balance = await getBalance(ip, 't1TRUNKQMx1DVzym4d2Ay5E1dudEcHiyk9C');
          if (balance !== 10024750000000) {
            badFluxBalance.push(ip);
            console.log(i + ' ' + ip + ' balance is bad ' + balance);
          }
        }
        i++;
      }
      setTimeout(() => {
        console.log(badFluxes);
        console.log(badFluxBalance);
      }, 1000);
    }, 2000);
  }
}

async function getBalance(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const updateResponse = await axios.get(`http://${ip}:16127/zelcash/getbalance`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 3456,
    });
    if (updateResponse.data.status === 'success') {
      return true
    } else {
      throw false
    }
  } catch (error) {
    return false
  }
}

async function amIAdmin() {
  loadLogins();
  let i = 1;
  const admins = [];
  setTimeout(async () => {
    const ips = Object.keys(logins)
    const totalNodes = ips.length;
    console.log(totalNodes);
    for (const ip of ips) {
      const admin = await getBalance(ip);
      if (admin) {
        console.log('admin on ' + ip);
        admins.push(ip)
      } else {
        console.log(i + ' ' + ip);
      }
      i++;
    }
    setTimeout(() => {
      console.log(admins);
    }, 1000);
  }, 2000);
}

async function startFolding(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    await axios.get(`http://${ip}:16127/zelapps/zelapptemporarylocalregister/foldingathome`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 3456,
    });
    return true;
  } catch (error) {
    return false
  }
}

async function massStartFolding() {
  loadLogins();
  let i = 1;
  const admins = [];
  setTimeout(async () => {
    const ips = [
    ];
    const totalNodes = ips.length;
    console.log(totalNodes);
    for (const ip of ips) {
      const folding = await startFolding(ip);
      if (folding) {
        console.log("hurray")
      } else {
        console.log(ip);
      }
      i++;
    }
    setTimeout(() => {
      console.log(admins);
    }, 1000);
  }, 2000);
}

// massStartFolding();
massFluxUpdate();
// massZelBenchCheck();
// massHardFluxUpdate();
// loadLogins();
// getBadFLuxVersions();
// setTimeout(() => {
  // massZelBenchUpdate2('77.37.224.231');
  // updateZelFluxTheHardWay('167.86.116.11');
  // massLogin();
// }, 2000)

// getBadFluxScannedHeights();