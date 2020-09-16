const btcmessage = require('bitcoinjs-message');
const qs = require('qs');
const axios = require('axios');
const zeltrezjs = require('zeltrezjs');
const os = require('os');
const fs = require('fs')

const address = '132hG26CFTNhLM3MRsLEJhp9DpBrK6vg5N';
const privateKey = '';

let logins = {};

// helper function for timeout on axios connection
const axiosGet = (url, options = {
  timeout: 6000,
}) => {
  const abort = axios.CancelToken.source();
  const id = setTimeout(
    () => abort.cancel(`Timeout of ${options.timeout}ms.`),
    options.timeout,
  );
  return axios
    .get(url, { cancelToken: abort.token, ...options })
    .then((res) => {
      clearTimeout(id);
      return res;
    });
};

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getIPaddresses() {
  try {
    const ips = [];
    const ip = '78.46.138.249';
    const detZelNodes = await axiosGet(`http://${ip}:16127/zelcash/viewdeterministiczelnodelist`);
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
    const loginPhraseResponse = await axiosGet(`http://${ip}:16127/zelid/loginphrase`);
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
    const loginPhraseResponse = await axiosGet(`http://${ip}:16127/zelflux/version`, axiosConfig);
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
    const scannedHeightResponse = await axiosGet(`http://${ip}:16127/explorer/scannedheight`);
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
    const balanceResponse = await axiosGet(`http://${ip}:16127/explorer/balance/${address}`);
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
    const loginPhraseResponse = await axiosGet(`http://${ip}:16127/zelbench/getinfo`);
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
    const zelbenchStatus = await axiosGet(`http://${ip}:16127/zelbench/getstatus`);
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
    const loginPhraseResponse = await axiosGet(`http://${ip}:16127/explorer/scannedheight`);
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
    const restartResponse = await axiosGet(`http://${ip}:16127/zelcash/ping`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 3456,
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
    const restartResponse = await axiosGet(`http://${ip}:16127/zelbench/restartnodebenchmarks`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 3456,
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
    const restartResponse = await axiosGet(`http://${ip}:16127/zelcash/restart`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 3456,
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
    const restartResponse = await axiosGet(`http://${ip}:16127/explorer/restart`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 3456,
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
    const restartResponse = await axiosGet(`http://${ip}:16127/explorer/stop`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 3456,
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
    const updateResponse = await axiosGet(`http://${ip}:16127/zelnode/updatezelbench`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 3456,
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
    axiosGet(`http://${ip}:16127/zelnode/updatezelbench`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 3456,
    });
  } catch (error) {
    return 'OK2';
  }
}

async function updateZelCash(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const updateResponse = await axiosGet(`http://${ip}:16127/zelnode/updatezelcash`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 3456,
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
    const updateResponse = await axiosGet(`http://${ip}:16127/zelnode/updatezelflux`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 3456,
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
    const updateResponse = await axiosGet(`http://${ip}:16127/zelnode/zelfluxerrorlog`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 3456,
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
    const updateResponse = await axiosGet(`http://${ip}:16127/zelnode/hardupdatezelflux`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 3456,
    });
    console.log(updateResponse);
    if (updateResponse.data.status === 'success') {
      return 'OK';
    } else {
      console.log(updateResponse.data.data)
      throw updateResponse.data.data;
    }
  } catch (error) {
    console.log(error);
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
  const ipsObtained = [
    '51.210.101.12', '212.76.131.121',
    '144.91.79.167', '212.76.131.123',
    '212.76.131.124', '212.76.131.122',
    '212.76.131.125', '95.216.236.188',
    '62.171.166.107', '207.180.238.133',
    '212.76.131.126', '62.171.155.255',
    '207.180.223.210', '167.86.116.61',
    '95.216.236.185', '80.197.251.29',
    '144.91.101.109', '167.86.120.217',
    '5.189.148.86', '5.189.140.48',
    '207.180.198.90', '5.189.143.224',
    '193.188.15.236', '167.86.93.137',
    '62.171.144.101', '62.171.184.53',
    '167.86.99.108', '193.188.15.215',
    '47.22.47.175', '195.201.152.42',
    '193.38.34.94', '193.38.34.95',
    '94.130.225.51', '193.38.33.172',
    '193.38.34.87', '193.38.35.101'
  ] // await getIPaddresses();
  let i = 1;
  if (ipsObtained.length > 0) {
    setTimeout(async () => {
      for (const ip of ipsObtained) {
        if (true) {
          const loggedIn = await login(ip);
          console.log(i + ' ' + ip + ': ' + loggedIn);
        } else {
          // const loggedIn = await login(ip);
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
      if (fluxVersion < 71) {
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
      '47.22.47.172',
      '47.22.47.171',
      '111.231.20.159',
      '47.22.47.183'
    ];
    const totalNodes = ips.length;
    console.log(totalNodes);
    for (const ip of ips) {
      const fluxVersion = await getFluxVersion(ip);
      console.log('Flux version on ' + i + ' ' + ip + ': v' + fluxVersion);
      i++;
      if (fluxVersion < 67) {
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
        if (fluxVersion < 70) {
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
    const updateResponse = await axiosGet(`http://${ip}:16127/zelcash/getbalance`, {
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
    await axiosGet(`http://${ip}:16127/zelapps/zelapptemporarylocalregister/foldingathome`, {
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

async function removeFolding(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    await axiosGet(`http://${ip}:16127/zelapps/zelapptemporarylocalregister/foldingathome`, {
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

async function massRemoveFolding() {
  loadLogins();
  let i = 1;
  const admins = [];
  setTimeout(async () => {
    const ips = [
      "95.111.233.172",
      "144.91.64.170",
      "167.86.66.88",
      "173.212.216.79",
      "173.212.216.77",
      "95.216.213.163",
      "173.212.193.35",
      "5.189.156.101",
      "173.212.208.89",
      "5.189.173.91",
      "128.199.33.74",
      "161.35.30.52",
      "64.227.122.49",
      "142.93.38.140",
      "167.172.51.111",
      "213.136.91.164",
      "78.47.38.49",
      "136.244.115.194",
      "157.230.99.218",
      "142.93.58.121",
      "62.171.146.23",
      "173.212.216.78",
      "167.86.92.213",
      "193.188.15.228",
      "68.148.97.166",
      "193.188.15.205",
      "193.188.15.229",
      "193.188.15.206",
      "95.111.252.134",
      "165.22.239.94",
      "173.249.40.8",
      "185.2.102.137",
      "167.86.104.98",
      "62.171.173.202",
      "95.179.216.96",
      "95.179.218.163",
      "95.179.217.172",
      "45.32.148.83",
      "193.188.15.209",
      "62.171.148.97",
      "193.188.15.240",
      "167.86.107.21",
      "66.119.15.217",
      "66.119.15.218",
      "66.119.15.220",
      "66.119.15.215",
      "66.119.15.227",
      "66.119.15.219",
      "66.119.15.221",
      "66.119.15.229",
      "66.119.15.228",
      "66.119.15.226",
      "62.171.191.210",
      "62.171.189.92",
      "95.217.218.184",
      "78.46.136.4",
      "95.216.208.24",
      "173.212.202.69",
      "62.171.189.125",
      "35.197.16.243",
      "193.188.15.249",
      "173.249.38.232",
      "173.249.25.41",
      "164.68.119.241",
      "207.180.223.23",
      "167.86.99.92",
      "173.212.216.232",
      "144.91.76.89",
      "62.171.153.162",
      "62.171.180.233",
      "207.180.223.210",
      "62.171.160.119",
      "164.68.108.244",
      "167.86.95.102",
      "144.91.66.23",
      "144.91.65.29",
      "164.68.98.165",
      "104.237.129.61",
      "144.91.68.252",
      "159.69.194.193",
      "95.216.204.228",
      "62.171.181.31",
      "128.199.92.4",
      "167.86.81.87",
      "164.68.120.91",
      "173.249.36.206",
      "5.189.184.185",
      "62.171.142.13",
      "95.217.213.69",
      "62.171.176.241",
      "62.171.169.9",
      "167.86.93.137",
      "5.189.163.71",
      "167.86.126.157",
      "62.171.137.112",
      "167.86.102.102",
      "167.86.95.80",
      "62.171.169.145",
      "62.171.144.101",
      "167.86.101.156",
      "95.217.164.11",
      "95.217.163.128",
      "94.130.226.7",
      "85.3.14.228",
      "62.171.184.64",
      "62.171.153.25",
      "5.189.182.226",
      "96.52.85.219",
      "96.52.90.87",
      "193.188.15.250",
      "72.194.134.226",
      "5.189.138.46",
      "167.86.116.11",
      "167.86.103.66",
      "207.180.211.141",
      "144.91.101.109",
      "62.171.186.127",
      "66.119.15.222",
      "95.217.162.174",
      "95.217.182.253",
      "95.216.77.149",
      "144.76.105.22",
      "95.216.77.56",
      "95.216.97.138",
      "193.188.15.152",
      "95.216.115.243",
      "95.216.97.103",
      "68.148.126.250",
      "164.68.100.13",
      "62.171.163.42",
      "167.86.90.21",
      "95.216.73.36",
      "95.217.58.162",
      "86.121.14.173",
      "193.188.15.153",
      "85.238.106.181",
      "95.216.99.220",
      "193.188.15.157",
      "144.91.77.187",
      "95.217.72.235",
      "68.148.99.182"
    ]
    const totalNodes = ips.length;
    console.log(totalNodes);
    for (const ip of ips) {
      const folding = await removeFolding(ip);
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

async function isMessageOrError(ip) {
  try {
    const axiosConfig = {
      timeout: 3456,
    };
    const mesRes = await axiosGet(`http://${ip}:16127/zelapps/temporarymessages`, axiosConfig);
    if (mesRes.data.data.length === 1) {
      return true;
    } else {
      console.log('kaaaapppaaa');
      return false;
    }
  } catch (error) {
    return false;
  }
}

async function massCheckMessage() {
  let i = 1;
  const admins = [];
  const ips = await getIPaddresses();
  const totalNodes = ips.length;
  console.log(totalNodes);
  for (const ip of ips) {
    const okok = await isMessageOrError(ip);
    if (okok === true) {
      console.log(i + 'ok ' + ip);
    } else {
      console.log('not ok on ' + ip);
      admins.push(ip)
    }
    i++;
  }
  setTimeout(() => {
    console.log(admins);
  }, 1000);
}

async function stopBlocking(ip) {
  try {
    const axiosConfig = {
      timeout: 3456,
    };
    await axiosGet(`http://${ip}:16127/explorer/stop`, axiosConfig);
    return true;
  } catch (error) {
    return false;
  }
}

async function stopBlockProcessing() {
  const ips = [
    '78.46.138.249',
    '78.46.225.128',
    '78.47.186.73',
    '78.47.187.148',
    '88.99.37.192',
    '88.99.80.124',
    '78.47.171.161',
    '116.202.21.109',
    '78.47.227.245',
    '95.216.218.48',
    '116.202.22.239',
    '116.202.25.66'
  ]
  let i = 0;
  const totalNodes = ips.length;
  console.log(totalNodes);
  for (const ip of ips) {
    const okok = await stopBlocking(ip);
    console.log(i);
    i++;
  }
}

async function reindexExplorer(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const axiosConfig = {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 3456,
    };
    const response = await axiosGet(`http://${ip}:16127/explorer/reindex/true`, axiosConfig);
    // console.log(response);
    return response.data.data
  } catch (error) {
    return error.message;
  }
}

async function checkNewDatabase(ip) {
  try {
    const axiosConfig = {
      timeout: 3456,
    };
    const response = await axiosGet(`http://${ip}:16127/explorer/utxo/t3c51GjrkUg7pUiS8bzNdTnW2hD25egWUih`, axiosConfig);
    const data = response.data.data;
    console.log(data);
    if (data[0]) {
      if (data[0].vout === 1) {
        return false;
      }
      return true;
    }
    return false
  } catch (error) {
    return false;
  }
}

async function massCheckNewDatabase() {
  loadLogins();
  let i = 1;
  setTimeout(async () => {
    const ips = Object.keys(logins)
    const totalNodes = ips.length;
    console.log(totalNodes);
    for (const ip of ips) {
      const reindexNeeded = await checkNewDatabase(ip);
      console.log(`Flux ${i} ${ip} ${reindexNeeded}`);
      i++
      if (reindexNeeded) {
        const reindexResponse = await reindexExplorer(ip);
        console.log('Reindexing Flux on ' + ip + ': ' + (reindexResponse ? reindexResponse.message : reindexResponse));
      }
    }
  }, 2000);
}

async function getOldFoldingAtHomes() {
  try {
    const response = await axios.get('https://api.flux.zel.network/fluxinfo');
    const badIps = [];
    response.data.data.forEach((flux) => {
      // console.log(flux);
      if (flux.zelapps) {
        if (flux.zelapps.runningapps.length > 0) {
          flux.zelapps.runningapps.forEach((zelapp) => {
            if (zelapp.Names[0] === "/zelFoldingAtHome") {
              badIps.push(flux.ip);
              console.log(flux.ip);
            }
          });
        }
      }
    });
    console.log(badIps);
  } catch (error) {
    console.log(error);
  }
}

getOldFoldingAtHomes()
// massStartFolding();
// massFluxUpdate();
// massZelBenchCheck();
// massHardFluxUpdate();
// loadLogins();
// getBadFLuxVersions();
// massCheckNewDatabase();
// setTimeout(() => {
  // stopBlockProcessing();
  // massZelBenchUpdate2('77.37.224.231');
  // updateZelFluxTheHardWay('95.179.208.158');
  // massLogin();
// }, 2000)

// getBadFluxScannedHeights();
// massCheckMessage();