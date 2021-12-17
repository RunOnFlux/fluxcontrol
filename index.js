const btcmessage = require('bitcoinjs-message');
const qs = require('qs');
const axios = require('axios');
const zeltrezjs = require('zeltrezjs');
const os = require('os');
const fs = require('fs')

const address = '1hjy4bCYBJr4mny4zCE85J94RXa8W6q37';
const privateKey = '';

let logins = {};


// helper function for timeout on axios connection
const axiosGet = (url, options = {
  timeout: 20000,
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
    const detZelNodes = await axiosGet(`https://api.runonflux.io/daemon/viewdeterministiczelnodelist`);
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
  console.log(logins);
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
    const loginPhraseResponse = await axiosGet(`http://${ip}:16127/id/loginphrase`);
    if (loginPhraseResponse.data.status === 'success') {
      return loginPhraseResponse.data.data;
    } else {
      throw loginPhraseResponse.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}

async function getMessage(ip, message) {
  try {
    const loginPhraseResponse = await axiosGet(`http://${ip}:16127/apps/hashes`);
    if (loginPhraseResponse.data.status === 'success') {
      const messFound = loginPhraseResponse.data.data.find((a) => a.hash === message && a.message === true);
      if (messFound) {
        return true;
      }
      return false;
    }
    return false
  } catch (error) {
    console.log(error);
  }
}


// returns number of minor flux version
async function getFluxVersion(ip) {
  try {
    const axiosConfig = {
      timeout: 6666,
    };
    const loginPhraseResponse = await axiosGet(`http://${ip}:16127/flux/version`, axiosConfig);
    if (loginPhraseResponse.data.status === 'success') {
      return loginPhraseResponse.data.data;
      return Number(loginPhraseResponse.data.data.split('.')[2]);
    } else {
      throw loginPhraseResponse.data.data;
    }
  } catch (error) {
    console.log(error);
  }
}

async function getApplications(ip) {
  try {
    const axiosConfig = {
      timeout: 4567,
    };
    const loginPhraseResponse = await axiosGet(`http://${ip}:16127/apps/globalappsspecifications`, axiosConfig);
    if (loginPhraseResponse.data.status === 'success') {
      return loginPhraseResponse.data.data;
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
    const loginPhraseResponse = await axiosGet(`http://${ip}:16127/benchmark/getinfo`);
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
async function getZelCashVersion(ip) {
  try {
    const loginPhraseResponse = await axiosGet(`http://${ip}:16127/daemon/getinfo`);
    if (loginPhraseResponse.data.status === 'success') {
      return Number(loginPhraseResponse.data.data.version);
    } else {
      return 'BAD';
    }
  } catch (error) {
    return 'BAD';
  }
}

async function getZelCashError(ip) {
  try {
    const getInfoResp = await axiosGet(`http://${ip}:16127/daemon/getinfo`);
    // console.log(getInfoResp.data.data.errors);
    if (getInfoResp.data.status === 'success') {
      if (getInfoResp.data.data.errors.includes('EXCEPTION')) {
        return 'BAD';
      }
      if (getInfoResp.data.data.blocks < 986549) {
        return 'BAD';
      }
      return 'OK';
    }
  } catch (error) {
    return 'BAD';
  }
}

// returns number of scannedheight
async function isAllOnNodeOK(ip) {
  try {
    const zelbenchStatus = await axiosGet(`http://${ip}:16127/benchmark/getstatus`);
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
    const restartResponse = await axiosGet(`http://${ip}:16127/daemon/ping`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
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
    const restartResponse = await axiosGet(`http://${ip}:16127/benchmark/restartnodebenchmarks`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
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

async function broadcastMessage(ip, message) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    console.log(authHeader);
    const response = await axios.post(`http://${ip}:16127/flux/broadcastmessage`, JSON.stringify(message), {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 22567,
    });
    console.log(response.data);
  } catch (error) {
    console.log(error);
  }
}

async function restartDaemon(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const restartResponse = await axiosGet(`http://${ip}:16127/daemon/restart`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
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
      timeout: 4567,
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
      timeout: 4567,
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
    const updateResponse = await axiosGet(`http://${ip}:16127/flux/updatebenchmark`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
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
    axiosGet(`http://${ip}:16127/flux/updatebenchmark`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
  } catch (error) {
    return 'OK2';
  }
}

async function updateZelCash(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const updateResponse = await axiosGet(`http://${ip}:16127/flux/updatedaemon`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
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

async function updateZelCashFast(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    axiosGet(`http://${ip}:16127/flux/updatedaemon`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
  } catch (error) {
    return 'OK2';
  }
}

async function updateZelFlux(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const updateResponse = await axiosGet(`http://${ip}:16127/flux/softupdateflux`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 6666,
    });
    if (updateResponse.data.status === 'success') {
      return 'OK';
    } else {
      throw updateResponse.data.data;
    }
  } catch (error) {
    console.log(error);
    return 'OK2';
  }
}

const abc = [];
async function rescanApps(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const updateResponse = await axiosGet(`http://${ip}:16127/apps/rescanglobalappsinformation/10/false`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
    if (updateResponse.data.status === 'success') {
      return 'OK';
    } else {
      throw updateResponse.data.data;
    }
  } catch (error) {
    console.log(error);
    abc.push(ip);
    console.log(JSON.stringify(abc));
    return 'OK2';
  }
}

async function getZelFluxErrorLog(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const updateResponse = await axiosGet(`http://${ip}:16127/flux/errorlog`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
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
    const updateResponse = await axiosGet(`http://${ip}:16127/flux/hardupdateflux`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 3333,
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
    const verifyLogin = await axios.post(`http://${ip}:16127/id/verifylogin`, qs.stringify(zelidauth));
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
  // const ipsObtained = await getIPaddresses();
  const ipsObtained = ["185.237.252.127", "95.216.80.125"]
  let i = 1;
  if (ipsObtained.length > 0) {
    setTimeout(async () => {
      for (const ip of ipsObtained) {
        if (!logins[ip]) {
          const loggedIn = await login(ip);
          console.log(i + ' ' + ip + ': ' + loggedIn);
        } else {
          const loggedIn = await login(ip);
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
    // const ips = Object.keys(logins)
    // const ips = await getIPaddresses();
    const ips = ["185.237.252.127", "95.216.80.125"]
    const totalNodes = ips.length;
    console.log(totalNodes);
    for (const ip of ips) {
      const fluxVersion = await getFluxVersion(ip);
      console.log('Flux version on ' + i + ' ' + ip + ': v' + fluxVersion);
      i++;
      if (fluxVersion !== "3.0.5") {
        const updateResponse = await updateZelFlux(ip);
        console.log('Updating Flux on ' + ip + ': ' + updateResponse);
      }
    }
  }, 2000);
}

async function massRescanApps() {
  loadLogins();
  let i = 1;
  setTimeout(async () => {
    // const ips = Object.keys(logins)
    const ips = ["35.221.19.76", "34.86.68.176", "35.222.132.136", "34.75.72.119", "188.239.61.82", "35.238.242.0", "35.237.111.20", "193.188.15.180", "193.188.15.220", "85.3.13.198", "82.223.151.197", "144.126.137.180", "75.119.148.15", "62.75.255.37", "188.239.61.90", "173.212.250.66", "95.111.230.98", "78.35.147.57", "213.136.85.74", "143.198.236.144", "193.188.15.223", "84.44.151.75", "143.198.234.29", "62.171.152.220", "116.202.21.109", "88.99.37.192", "88.99.80.124", "95.111.241.238", "35.239.62.11", "35.196.48.184", "35.199.0.51", "173.249.33.162", "95.217.118.204", "95.111.226.196", "144.91.109.132", "35.221.30.130", "104.197.53.102", "35.196.116.67", "35.221.19.42", "35.199.40.149", "85.245.238.61", "35.243.198.127", "35.199.18.151", "144.126.137.179", "144.126.133.170", "62.171.138.132", "95.111.253.41", "144.126.133.172", "188.239.61.234", "159.224.161.151", "62.171.135.157", "213.136.89.166", "62.171.134.83", "62.171.134.84", "62.171.134.82", "207.180.210.204", "62.171.134.81", "95.111.251.232", "209.126.86.251", "188.239.61.197", "76.67.215.177", "193.188.15.238", "95.111.253.234", "75.119.151.215", "75.119.151.217", "75.119.151.216", "75.119.151.219", "75.119.151.218", "5.12.67.157", "144.126.134.53", "144.126.134.55", "79.114.164.152", "144.126.134.54", "95.111.253.140", "75.119.142.89", "209.126.5.199", "209.145.54.22", "209.145.55.195", "209.145.55.211", "95.111.253.225", "95.111.252.158", "95.111.253.188", "144.126.134.52", "62.171.138.114", "95.111.251.195", "95.111.253.21", "91.158.95.34", "209.145.49.19", "144.126.133.168", "91.158.95.32", "91.158.95.35", "91.158.95.36", "134.255.89.236", "80.86.87.214", "71.193.196.211", "45.152.69.106", "144.202.102.240", "45.77.215.15", "75.119.136.242", "45.152.69.107", "209.126.87.222", "35.224.87.164", "35.185.16.142", "35.188.248.168", "35.192.148.175", "35.212.125.209", "35.211.70.213", "35.211.225.168", "35.209.122.115", "207.148.12.197", "35.199.28.194", "104.155.178.142", "103.214.5.84", "213.136.76.5", "62.171.143.203", "100.0.18.35", "161.97.80.80", "70.191.253.197", "167.86.110.193", "167.86.78.221", "161.97.86.67", "5.189.190.45", "72.194.73.254", "161.97.160.216", "207.180.230.149", "207.244.238.183", "85.240.254.144", "193.188.15.229", "81.84.131.113", "85.25.15.243", "161.97.88.170", "207.244.151.163", "35.226.43.151", "174.93.123.77", "167.86.81.150", "159.203.91.217", "95.179.133.164", "62.171.158.74", "62.75.255.12", "85.25.154.140", "75.119.157.98", "144.91.91.191", "144.91.125.106", "193.164.131.243", "173.249.9.246", "161.97.156.91", "141.94.23.248", "45.152.69.111", "178.18.251.110", "5.13.118.14", "194.233.64.223", "167.86.100.244", "161.97.80.237", "161.97.72.141", "85.25.253.62", "80.135.114.220", "62.171.130.133", "124.248.134.137", "79.199.46.173", "155.138.213.219", "194.233.65.234", "121.6.59.148", "151.197.19.215", "216.128.130.67", "62.75.255.7", "161.97.80.172", "213.136.70.145", "161.97.116.135", "73.28.105.219", "45.152.69.110", "213.136.70.146", "62.171.137.180", "73.90.121.41", "161.97.80.147", "213.136.80.3", "45.156.21.41", "213.136.74.186", "167.86.111.132", "62.171.138.24", "24.41.196.147", "70.240.240.192", "104.34.3.208", "46.107.169.103", "93.226.27.202", "173.212.217.146", "164.68.110.44", "161.97.134.40", "106.53.205.109", "105.227.25.186", "93.104.211.181", "159.89.164.160", "128.199.191.162", "165.227.226.117", "5.189.146.147", "80.86.87.252", "62.171.129.62", "75.73.255.102", "62.171.175.50", "108.61.176.246", "161.97.120.219", "213.136.86.107", "35.194.65.178", "34.75.97.252", "144.91.110.208", "209.145.58.55", "75.119.156.131", "75.119.156.126", "144.126.138.169", "109.91.221.89", "35.211.142.161", "35.212.101.247", "34.86.218.21", "75.119.156.141", "194.233.69.242", "178.18.251.50", "193.188.15.228", "82.165.32.238", "96.19.75.243", "194.233.67.22", "207.180.248.242", "75.119.156.140", "144.91.79.210", "173.212.240.64", "79.199.12.88", "144.126.138.177", "75.119.156.130", "194.233.69.243", "194.233.69.241", "144.91.94.178", "75.119.156.137", "75.119.156.127", "23.17.252.9", "173.212.224.153", "161.97.120.217", "194.233.66.225", "161.97.120.225", "161.97.120.231", "161.97.120.221", "35.231.163.87", "213.136.91.82", "35.211.192.55", "35.209.76.223", "207.246.71.87", "135.181.103.41", "161.97.71.208", "165.227.227.114", "161.97.173.93", "161.97.173.94", "144.126.138.109", "144.126.133.171", "207.180.249.214", "79.117.239.162", "75.119.156.124", "62.171.140.75", "62.171.140.162", "75.119.156.123", "91.158.95.19", "75.119.156.125", "188.26.250.85", "209.126.80.18", "161.97.120.228", "75.119.159.16", "75.119.159.12", "75.119.159.13", "75.119.159.14", "75.119.157.165", "75.119.159.15", "75.119.155.157", "75.119.155.158", "75.119.156.128", "161.97.150.49", "76.67.215.236", "178.18.242.227", "75.119.139.55", "75.119.139.56", "75.119.139.57", "75.119.155.150", "144.126.137.178", "144.126.133.176", "144.126.133.173", "144.126.133.174", "75.119.139.53", "144.126.137.176", "144.126.137.177", "144.126.133.165", "75.119.139.54", "75.119.155.151", "144.126.133.167", "144.126.133.169", "144.126.133.166", "144.126.133.175", "75.119.155.152", "161.97.128.174", "75.119.155.153", "75.119.155.154", "75.119.156.129", "75.119.155.155", "75.119.155.156", "178.200.122.11", "95.95.187.105", "86.185.120.5", "46.188.43.138", "62.171.160.137", "79.199.44.207", "5.13.112.249", "140.82.0.77", "142.93.159.140", "161.97.175.76", "46.107.169.108", "167.86.88.75", "137.220.57.128", "135.181.198.213", "149.28.177.105", "79.118.142.229", "86.126.8.94", "75.119.131.181", "68.1.121.206", "144.91.101.55", "194.195.246.244", "40.68.143.217", "82.3.119.129", "207.180.249.3", "62.171.139.75", "62.171.139.121"]
    const totalNodes = ips.length;
    console.log(totalNodes);
    for (const ip of ips) {
      await rescanApps(ip);
    }
  }, 2000);
}

async function massHardFluxUpdate() {
  loadLogins();
  let i = 1;
  setTimeout(async () => {
    const ips = ["95.111.250.16","109.208.66.222","193.188.15.222","95.111.235.164","95.111.235.165","161.97.108.17","95.111.235.166"]
    const totalNodes = ips.length;
    console.log(totalNodes);
    for (const ip of ips) {
      const fluxVersion = await getFluxVersion(ip);
      console.log('Flux version on ' + i + ' ' + ip + ': v' + fluxVersion);
      i++;
      if (fluxVersion !== "3.0.4") {
        const updateResponse = await updateZelFluxTheHardWay(ip);
        console.log('Updating Flux on ' + ip + ': ' + updateResponse);
      }
    }
  }, 2000);
}

async function getBadFLuxVersions() {
  const ipsObtained = ["144.126.138.176","45.41.204.120","173.249.19.34","91.205.175.131","193.188.15.233","79.199.43.229","116.203.253.186","178.18.248.135","193.188.15.214","193.188.15.221"]
  // const ipsObtained = await getIPaddresses();
  // const ipsObtained = Object.keys(logins)
  console.log(ipsObtained.length);
  // const ipsObtained = 
  let badFluxes = [];
  let unreachableFluxes = [];
  let i = 1;
  if (ipsObtained.length > 0) {
    setTimeout(async () => {
      for (const ip of ipsObtained) {
        const fluxVersion = await getFluxVersion(ip);
        if (fluxVersion !== "3.0.5") {
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
        console.log(badFluxes.length);
        console.log(JSON.stringify(badFluxes));
        console.log(JSON.stringify(unreachableFluxes));
      }, 1000);
    }, 2000);
  }
}

async function getBadApplication() {
  // const ipsObtained = await getIPaddresses();
  const ipsObtained = ["89.163.164.90","45.77.74.26","149.5.28.97","188.34.195.98","71.236.186.242","173.212.238.62","161.97.92.94","75.119.135.174","161.97.114.241","5.167.249.250","164.68.109.68","167.86.121.153","161.97.110.180","144.91.88.0","161.97.119.167","161.97.149.227","164.68.123.163","144.91.100.96","161.97.99.231","95.216.142.156","84.85.48.154","194.163.151.79","82.165.254.206","161.97.97.194","176.57.184.60","173.249.50.4","62.171.159.189","62.171.171.108","161.97.165.7","176.57.184.49","192.248.181.20","62.171.154.225","161.97.116.109","95.217.118.211","202.61.203.229","202.61.201.53","78.141.222.192","45.77.52.113","62.171.180.210","202.61.202.107","161.97.141.146","144.202.101.97","161.97.107.87","193.188.15.209","194.163.168.238","62.171.146.2","144.91.110.245","109.205.183.77","161.97.99.59","161.97.99.69","207.180.249.3","107.152.47.22","192.227.150.60","193.188.15.190","161.97.118.82","95.111.227.39","88.212.61.100","202.61.201.128","95.217.118.204","194.163.132.181","144.91.95.237","207.244.236.91","193.188.15.186","193.188.15.187","193.188.15.192","62.171.153.81","193.188.15.184","192.248.189.63","66.94.123.168","62.171.179.13","85.240.254.144","109.235.67.17","2.81.78.7","139.180.167.246","151.80.155.92","161.97.91.207","144.126.155.113","207.180.249.55","62.171.136.18","207.244.254.212","149.28.117.233","164.68.127.33","202.61.229.134","109.205.183.58","151.197.19.215","193.188.15.225","161.97.137.24","161.97.110.171","65.21.172.58","207.180.244.24","144.126.155.210","144.91.116.126","75.119.155.135","194.163.168.62","194.233.67.22","194.163.168.40","161.97.99.236","68.183.73.250","75.119.136.62","95.111.240.33","173.212.202.69","109.205.183.22","66.94.123.159","109.205.183.215","45.77.137.29","5.189.170.51","149.28.69.12","95.111.252.95","95.111.224.33","193.188.15.226","135.181.103.41","45.132.247.146","167.86.95.52","194.163.187.91","173.249.25.119","31.19.128.172","65.21.190.144","168.119.150.71","75.119.155.134","207.180.219.104","5.189.184.99","173.249.36.206","161.97.119.215","202.61.200.217","109.205.183.92","202.61.200.125","95.216.91.20","89.233.105.18","95.217.118.197","89.233.105.188","161.97.175.66","194.163.163.214","161.97.137.151","95.216.91.21","202.61.250.53","78.26.171.231","161.97.172.226","173.249.23.246","194.163.189.248","202.61.203.55","95.216.124.211","95.216.124.212","69.64.46.16","161.97.169.30","161.97.76.82","194.163.189.245","161.97.171.241","161.97.138.172","46.173.134.135","46.173.134.139","95.216.91.22","46.173.134.175","46.173.134.191","46.173.134.162","46.173.134.156","161.97.175.191"]
  console.log(ipsObtained.length);
  let i = 1;
  const badips = [];
  if (ipsObtained.length > 0) {
    setTimeout(async () => {
      for (const ip of ipsObtained) {
        const apps = await getApplications(ip);
        if (apps) {
          if (apps.length < 33) {
            console.log(ip + ' IS A NOT CORRECT ' + apps.length);
            badips.push(ip);
            await reindexExplorer(ip);
          } else {
            const PokerTH = apps.find((app) => app.name === "PokerTH");
            if (!PokerTH) {
              console.log(ip + ' IS A NOT CORRECT B ' + apps.length);
              badips.push(ip);
              await reindexExplorer(ip);
            } else {
              if (PokerTH.height !== 955420) {
                console.log(ip + ' IS A NOT CORRECT C ' + apps.length + ' ' + PokerTH.height);
                badips.push(ip);
                await reindexExplorer(ip);
              } else {
                console.log(ip + ' IS A CORRECT');
              }
            }
          }
        }
        i++;
      }
      console.log(JSON.stringify(badips));
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
    const ipsAll = ["75.119.137.132","75.119.130.20","46.107.168.224","91.201.40.253","206.81.14.229","95.216.218.48","94.130.153.193","159.69.54.83","116.203.33.236","193.188.15.161","5.189.189.194"];
    const totalNodes = ipsAll.length;
    const ips = ipsAll;
    console.log(totalNodes);
    for (const ip of ips) {
      // const fluxVersion = await getFluxVersion(ip);
      // console.log('Flux version on ' + i + ' ' + ip + ': v' + fluxVersion);
      i++;
      // if (fluxVersion) {
      const zelbenchVersion = await getZelBenchVersion(ip);
      console.log(i + " " + ip + " " + zelbenchVersion);
      if (zelbenchVersion < 231) {
        console.log('Updating ' + ip);
        updateZelBenchFast(ip);
      }
      // }
    }
  }, 2000);
}

async function massZelCashUpdate2() {
  loadLogins();
  let i = 1;
  setTimeout(async () => {
    const ipsAll = await getIPaddresses(); //Object.keys(logins)
    const totalNodes = ipsAll.length;
    const ips = ipsAll;
    console.log(totalNodes);
    for (const ip of ips) {
      i++
      const zelcashVersion = await getZelCashVersion(ip);
      console.log(i);
      if (zelcashVersion < 5000150) {
        console.log('Updating ' + ip);
        updateZelCashFast(ip);
      }
    }
  }, 2000);
}

async function massZelBenchCheck() {
  loadLogins();
  let i = 0;
  setTimeout(async () => {
    const ipsAll = await getIPaddresses();
    const totalNodes = ipsAll.length;
    const ips = ipsAll;
    const badIps = [];
    console.log(totalNodes);
    for (const ip of ips) {
      i++;
      const zelbenchVersion = await getZelBenchVersion(ip);
      if (zelbenchVersion && zelbenchVersion < 231) {
        console.log(i + ' Update on ' + ip + ' ERROR');
        badIps.push(ip);
      }
    }
    console.log(JSON.stringify(badIps));
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
    const updateResponse = await axiosGet(`http://${ip}:16127/daemon/getbalance`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
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
    await axiosGet(`http://${ip}:16127/apps/installtemporarylocalapp/foldingathome`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
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
    const response = await axiosGet(`http://${ip}:16127/apps/appremove/zelFoldingAtHome`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
    console.log(response.data)
    return true;
  } catch (error) {
    console.log(error);
    return false
  }
}

async function removeDibiFetch(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const response = await axiosGet(`http://${ip}:16127/apps/appremove/DiBiFetch/true`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 44567,
    });
    console.log(response.data)
    return true;
  } catch (error) {
    console.log(error);
    return false
  }
}

async function getKadenaLocations() {
  try {
    const response = await axiosGet('https://stats.runonflux.io/kadena/allnodes');
    const ips = [];
    response.data.data.forEach((app) => {
      ips.push(app.ip);
    });
    console.log(JSON.stringify(ips));
    console.log(ips.length);
  } catch (error) {
    console.log(error);
  }
}

async function getApplicationLocations(application) {
  try {
    const ip = '5.189.156.101';
    const response = await axiosGet(`http://${ip}:16127/apps/location/${application}`, {
      timeout: 4567,
    });
    const ips = []
    response.data.data.forEach((instance) => {
      ips.push(instance.ip);
    });
    console.log(JSON.stringify(ips))
    console.log(ips.length);
    return true;
  } catch (error) {
    console.log(error);
    return false
  }
}

async function pauseKadena(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const response = await axiosGet(`http://${ip}:16127/apps/appunpause/KadenaChainWebNode`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
    });
    console.log(response.data)
    return true;
  } catch (error) {
    console.log(error);
    return false
  }
}

async function massRemoveDibiFetch() {
  loadLogins();
  let i = 1;
  const admins = [];
  setTimeout(async () => {
    const ips = ["152.228.141.255", "62.171.146.55", "95.216.213.163", "176.126.47.137", "95.161.13.44", "193.188.15.178", "82.37.1.113", "72.194.73.254", "193.34.145.254", "95.111.230.98", "207.244.238.183", "75.119.140.68", "78.214.200.69", "159.69.54.207", "5.13.112.249", "75.119.157.98", "173.212.253.185", "81.250.143.48", "144.91.125.106", "178.18.251.110", "206.81.18.160", "193.188.15.167", "95.111.251.107", "161.97.116.230", "75.119.133.69", "62.171.163.219", "161.97.141.146", "95.111.230.75", "212.76.131.111", "98.111.139.233", "212.76.131.116", "159.69.185.44", "95.216.142.156", "91.228.56.157", "62.171.186.131", "173.212.216.180", "173.249.37.4", "161.97.90.183", "75.73.255.102", "212.76.131.113", "161.97.183.19", "207.244.226.251", "195.206.229.64", "207.244.229.200", "62.171.162.149", "167.86.77.149", "23.124.56.141", "95.111.226.65", "62.171.146.17", "144.91.66.23", "159.69.194.193", "95.111.239.60", "95.111.235.124", "209.145.50.124", "159.69.54.83", "173.249.35.202", "193.188.15.252", "144.91.65.69", "161.97.124.103", "173.249.53.56", "161.97.102.204", "161.97.97.227", "209.145.58.55", "164.68.127.210", "84.44.151.75", "164.68.127.228", "144.91.87.71", "167.86.98.222", "173.249.21.3", "209.145.53.60", "164.68.101.236", "62.171.166.58", "75.119.157.8", "195.201.141.128", "194.233.67.22", "207.244.234.248", "75.119.157.162", "194.163.130.22", "95.111.245.69", "167.86.77.6", "144.91.92.5", "95.111.233.248", "95.111.233.251", "62.171.189.166", "207.180.223.75", "207.180.196.222", "193.188.15.155", "99.98.217.243", "95.216.124.199", "173.212.251.209", "75.119.134.102", "173.212.252.18", "193.188.15.234", "144.91.116.117", "75.119.156.124", "95.216.80.110", "207.180.237.118", "161.97.163.220", "62.171.138.114", "193.188.15.157", "193.188.15.227", "213.136.87.20", "188.239.61.196", "95.216.80.111", "75.119.137.56", "91.158.95.34"];
    const totalNodes = ips.length;
    console.log(totalNodes);
    for (const ip of ips) {
      const folding = await removeDibiFetch(ip);
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
      timeout: 4567,
    };
    const mesRes = await axiosGet(`http://${ip}:16127/apps/temporarymessages`, axiosConfig);
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
      timeout: 4567,
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
      timeout: 4567,
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
      timeout: 4567,
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
    const response = await axios.get('https://stats.runonflux.io/fluxinfo');
    const badIps = [];
    response.data.data.forEach((flux) => {
      // console.log(flux);
      if (flux.zelapps) {
        if (flux.zelapps.runningapps.length > 0) {
          flux.zelapps.runningapps.forEach((zelapp) => {
            if (zelapp.Names[0] === "/fluxDiBiFetch") {
              badIps.push(flux.ip);
              console.log(flux.ip);
            }
          });
        }
      }
    });
    console.log(JSON.stringify(badIps));
  } catch (error) {
    console.log(error);
  }
}

async function massZelCashErroCheck() {
  loadLogins();
  let i = 0;
  setTimeout(async () => {
    const ipsAll = Object.keys(logins)
    const totalNodes = ipsAll.length;
    const ips = ipsAll;
    console.log(totalNodes);
    for (const ip of ips) {
      const zelcashError = await getZelCashError(ip);
      if (zelcashError === "BAD") {
        console.log(`bad ${ip}`);
        restartDaemon(ip);
        // restart zelcash
      } else {
        console.log(ip);
      }
    }
  }, 2000);
}


async function massZelCashCheck() {
  loadLogins();
  let i = 0;
  setTimeout(async () => {
    const ipsAll = await getIPaddresses(); //Object.keys(logins)
    const totalNodes = ipsAll.length;
    const ips = ipsAll;
    console.log(totalNodes);
    for (const ip of ips) {
      const zelcashVersion = await getZelCashVersion(ip);
      if (zelcashVersion >= 4000550) {
        console.log('ok');
      } else if (zelcashVersion < 4000550) {
        console.log(ip);
        i++;
        console.log(i);
      } else {
        console.log(zelcashVersion)
      }
    }
  }, 2000);
}

async function masMessageCheck(message) {
  loadLogins();
  let i = 0;
  setTimeout(async () => {
    const ipsAll = await getIPaddresses(); //Object.keys(logins)
    const totalNodes = ipsAll.length;
    const ips = ipsAll;
    console.log(totalNodes);
    for (const ip of ips) {
      const zelcashVersion = await getMessage(ip, message);
      if (zelcashVersion === true) {
        console.log('ok');
        console.log(ip);
      } else {
        // console.log('notok');
        // console.log(ip);
      }
    }
  }, 2000);
}

async function rebuildZelFront(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    const updateResponse = await axiosGet(`http://${ip}:16127/flux/rebuildhome`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 4567,
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

async function containsDashboard(ip) {
  try {
    const response = await axios.get(`http://${ip}:16126`);
    if (response.data.includes('Flux, Your')) {
      return true;
    }
    return false
  } catch (e) {
    return false
  }
}

async function massCheckContainsDashboard() {
  loadLogins();
  setTimeout(async () => {
    const ipsAll = ["95.111.233.190", "95.111.247.100"]; // await getIPaddresses(); //Object.keys(logins)
    const totalNodes = ipsAll.length;
    const ips = ipsAll;
    console.log(totalNodes);
    for (const ip of ips) {
      const dashboardOK = await containsDashboard(ip);
      if (!dashboardOK) {
        await rebuildZelFront(ip);
        console.log(ip);
      }
    }
  }, 2000);
}

// getKadenaLocations();
// getApplicationLocations('KadenaChainWebNode');
// massPauseKadena()
// massZelCashErroCheck()
// massZelBenchUpdate2()
// massZelCashCheck();
// massRemoveFolding();
// getOldFoldingAtHomes()
// massStartFolding();
// massFluxUpdate();
// massZelBenchCheck();
// massHardFluxUpdate();
// massCheckContainsDashboard()
// massCheckNewDatabase();
// loadLogins();
// setTimeout(() => {
//   massLogin();
// }, 2000)
// getBadFluxScannedHeights();
// massCheckMessage();
// massRemoveDibiFetch();
// massZelCashErroCheck();
// const signature = signMessage("1619938137061r35mcztku9rt92v26wsl0m1ghwyhuwlrki4ur5zso3w",privateKey);
// console.log(signature);
// getBadFLuxVersions();
// massRescanApps();

// loadLogins();
// setTimeout(() => {
//   getBadApplication();
// }, 2000)
masMessageCheck('11463c7503c0ced8f9b876bffe9efc15bf9f9fdf5da353d044d2f82dcf2516ba');
// loadLogins();
// const message = {
//   type: 'fluxappregister',
//   version: 1,
//   appSpecifications: {
//     version: 4,
//     name: 'PresearchNode1639733534159',
//     description: 'Presearch is a Decentralized Search Engine - Host your Presearch Node on the Flux Network',
//     owner: '1HrFAWX4PorbhDv5uHpGYZY9CZaB5Kvb9j',
//     compose: [{
//       // eslint-disable-next-line max-len
//       name: 'node', description: 'The Presearch node container', repotag: 'presearch/node:latest', ports: [39361], domains: [''], environmentParameters: ['REGISTRATION_CODE=ba5ac6f70058926ae1b6f48e25d9a6b5'], commands: [], containerPorts: [38253], containerData: '/app/node', cpu: 0.3, ram: 300, hdd: 2, tiered: false,
//     }],
//     instances: 3,
//   },
//   hash: '3a9006cba1dca2877c50bfa5a5ac39d998a5ac74e79bb89ffb13f7bde5489aba',
//   timestamp: 1639733534966,
//   signature: 'IEJHpF4qPrDQhPnJTnT4o4U2LThYO3BaQVL3fbixGMn6Oltl04M4RH6mXipn9WJ6DdDO8LgytuaLORG5GDwgN6g=',
// };
// setTimeout(() => {
//   broadcastMessage('173.212.251.209', message);
// }, 2000)