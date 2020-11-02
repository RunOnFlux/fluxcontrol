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
    const ip = '173.212.252.18';
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
      return loginPhraseResponse.data.data;
      return Number(loginPhraseResponse.data.data.split('.')[2]);
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
async function getZelCashVersion(ip) {
  try {
    const loginPhraseResponse = await axiosGet(`http://${ip}:16127/zelcash/getinfo`);
    if (loginPhraseResponse.data.status === 'success') {
      return Number(loginPhraseResponse.data.data.version);
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

async function updateZelCashFast(ip) {
  try {
    authHeader = await getAuthHeader(ip);
    const zelidauthHeader = authHeader;
    axiosGet(`http://${ip}:16127/zelnode/updatezelcash`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 3456,
    });
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
    console.log(error);
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
    '212.76.131.122', '208.107.141.71',  '111.229.114.104', '116.85.70.212',
    '188.138.88.30',  '167.86.71.144',   '144.91.64.170',   '92.60.37.15',
    '188.239.61.176', '193.188.15.186',  '116.85.13.145',   '161.97.78.199',
    '193.188.15.232', '193.188.15.222',  '95.217.118.211',  '116.202.231.3',
    '212.76.131.109', '212.76.131.118',  '212.76.131.99',   '212.76.131.101',
    '212.76.131.102', '161.97.67.70',    '46.4.72.125',     '164.68.127.62',
    '144.91.76.89',   '164.68.97.207',   '161.97.77.162',   '164.68.127.117',
    '164.68.127.228', '164.68.108.244',  '167.86.95.102',   '213.32.104.71',
    '164.68.127.210', '188.138.88.146',  '164.68.127.33',   '161.97.77.55',
    '161.97.77.58',   '85.25.145.33',    '103.214.5.89',    '47.244.162.174',
    '144.91.66.23',   '164.68.121.49',   '164.68.109.49',   '81.68.192.106',
    '164.68.98.165',  '164.68.106.123',  '49.235.70.30',    '49.235.116.125',
    '164.68.98.41',   '111.229.139.192', '167.86.112.253',  '161.97.76.87',
    '164.68.97.226',  '72.194.134.226',  '167.86.98.222',   '164.68.106.42',
    '49.235.110.24',  '49.235.110.163',  '62.171.186.127',  '164.68.127.159',
    '167.86.92.188',  '188.138.88.137',  '62.171.180.232',  '81.68.67.162',
    '87.61.82.198',   '62.171.160.119',  '119.45.47.77',    '144.91.65.29',
    '193.188.15.165', '85.238.106.181',  '146.56.196.41',   '119.45.37.30',
    '95.217.118.197', '95.216.91.22',    '95.216.91.20',    '129.211.137.210',
    '193.188.15.231', '193.38.34.95',    '119.45.255.182',  '47.22.47.186',
    '122.51.127.192', '193.38.34.91',    '46.4.72.119',     '95.216.80.98',
    '95.216.80.99',   '49.235.110.103',  '81.68.218.33',    '81.68.216.88',
    '49.235.109.102', '81.68.249.97',    '81.68.249.60',    '81.68.115.205',
    '91.235.197.251', '193.188.15.221',  '119.45.194.175',  '111.229.123.210',
    '81.68.204.173',  '111.231.20.159',  '95.216.91.21'
  ]
  //await getIPaddresses();
  let i = 1;
  if (ipsObtained.length > 0) {
    setTimeout(async () => {
      for (const ip of ipsObtained) {
        if (!logins[ip]) {
          const loggedIn = await login(ip);
          console.log(i + ' ' + ip + ': ' + loggedIn);
        } else {
          const loggedIn = await login(ip);
          // console.log(i + ' ' + ip + ': already logged in.');
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
    const ips = [
      '92.60.37.15',     '116.85.13.145',
      '111.229.114.104', '116.85.70.212',
      '167.86.71.144',   '188.138.88.146',
      '85.25.145.33',    '103.214.5.89',
      '47.244.162.174',  '81.68.192.106',
      '49.235.70.30',    '49.235.116.125',
      '111.229.139.192', '49.235.110.24',
      '49.235.110.163',  '62.171.180.232',
      '81.68.67.162',    '46.4.72.125',
      '129.211.137.210', '119.45.255.182',
      '47.22.47.186',    '49.235.110.103',
      '81.68.218.33',    '81.68.216.88',
      '49.235.109.102',  '81.68.249.97',
      '81.68.249.60',    '81.68.115.205',
      '111.229.123.210', '81.68.204.173'
    ]
    // const ips = Object.keys(logins);
    // const ips = ["193.188.15.158","193.188.15.156","62.171.153.162","161.97.90.72","62.171.142.13","167.86.112.36","193.188.15.217","193.188.15.253","173.249.37.203","5.189.158.155","78.47.17.197","62.171.129.78","173.212.244.61","62.171.178.237","173.212.228.219","66.119.15.216","161.97.77.55","161.97.79.95","144.91.97.7","95.111.236.187","161.97.74.239","207.180.231.22","164.68.107.31","62.171.146.21","95.111.228.182","62.171.184.53","207.180.252.235","62.171.162.149","144.91.76.192","161.97.77.56","161.97.77.57","161.97.97.227","173.212.217.110","161.97.77.58","161.97.103.214","193.188.15.208","5.189.173.167","144.91.76.89","167.86.85.106","62.171.146.12","161.97.99.69","62.171.166.59","207.180.211.141","144.91.92.138","72.194.134.226","82.76.167.66","161.97.102.82","62.171.137.112","144.91.87.50","49.12.110.184","85.3.14.228","193.188.15.154","161.97.75.194","161.97.83.48","167.86.77.87","95.111.224.247","95.111.235.179","62.171.184.64","193.188.15.227","167.86.109.162","62.171.146.17","62.171.166.56","193.188.15.165","62.171.181.156","161.97.102.84","207.180.198.90","161.97.102.83","62.171.164.66","62.171.163.42","193.188.15.225","167.86.112.253","193.188.15.157","207.244.224.135","116.202.109.37","62.171.178.236","95.111.245.68","193.188.15.243","167.86.106.174","164.68.100.13","62.171.144.23","95.111.245.151","164.68.101.236","62.171.168.22","62.171.186.127","173.249.6.174","66.119.15.215","62.171.173.1","161.97.103.213","173.212.216.232","161.97.97.80","95.216.142.189","161.97.102.227","193.188.15.254","167.86.81.87","94.130.226.7","161.97.102.226","207.180.212.3","62.171.166.58","62.171.146.18","161.97.102.204","161.97.89.179","62.171.188.152","164.68.119.241","193.188.15.155","95.111.226.65","173.212.229.38","207.180.223.210","62.171.146.16","207.180.225.231","173.212.238.11","78.47.142.176","62.171.155.255","161.97.90.73","161.97.97.102","95.111.226.131","161.97.74.238","49.12.72.117","95.217.213.69","62.171.190.234","167.172.159.136","116.203.117.163","193.188.15.210","193.188.15.153","161.97.90.182","193.188.15.152","85.25.145.33","47.22.47.165","47.22.47.177","47.22.47.178","193.188.15.159","47.22.47.167","173.212.251.209","173.212.252.18","85.23.155.93","193.188.15.226","108.58.190.253","173.212.248.228","47.22.47.165\n","176.33.15.198","161.97.102.205"];
    // Object.keys(logins)
    const totalNodes = ips.length;
    console.log(totalNodes);
    for (const ip of ips) {
      const fluxVersion = await getFluxVersion(ip);
      console.log('Flux version on ' + i + ' ' + ip + ': v' + fluxVersion);
      i++;
      if (fluxVersion !== "1.4.0") {
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
      '92.60.37.15',     '116.85.13.145',
      '111.229.114.104', '116.85.70.212',
      '167.86.71.144',   '188.138.88.146',
      '85.25.145.33',    '103.214.5.89',
      '47.244.162.174',  '81.68.192.106',
      '49.235.70.30',    '49.235.116.125',
      '111.229.139.192', '49.235.110.24',
      '49.235.110.163',  '62.171.180.232',
      '81.68.67.162',    '46.4.72.125',
      '129.211.137.210', '119.45.255.182',
      '47.22.47.186',    '49.235.110.103',
      '81.68.218.33',    '81.68.216.88',
      '49.235.109.102',  '81.68.249.97',
      '81.68.249.60',    '81.68.115.205',
      '111.229.123.210', '81.68.204.173'
    ]
    const totalNodes = ips.length;
    console.log(totalNodes);
    for (const ip of ips) {
      const fluxVersion = await getFluxVersion(ip);
      console.log('Flux version on ' + i + ' ' + ip + ': v' + fluxVersion);
      i++;
      if (fluxVersion < 1) {
        const updateResponse = await updateZelFluxTheHardWay(ip);
        console.log('Updating Flux on ' + ip + ': ' + updateResponse);
      }
    }
  }, 2000);
}

async function getBadFLuxVersions() {
  const ipsObtained = [
         '116.85.13.145',
    '111.229.114.104', '116.85.70.212',
    '167.86.71.144',   '188.138.88.146',
    '85.25.145.33',    '103.214.5.89',
    '47.244.162.174',  '81.68.192.106',
    '49.235.70.30',    '49.235.116.125',
    '111.229.139.192', '49.235.110.24',
    '49.235.110.163',  '62.171.180.232',
    '81.68.67.162',    '46.4.72.125',
    '129.211.137.210', '119.45.255.182',
    '47.22.47.186',    '49.235.110.103',
    '81.68.218.33',    '81.68.216.88',
    '49.235.109.102',  '81.68.249.97',
    '81.68.249.60',    '81.68.115.205',
    '111.229.123.210', '81.68.204.173'
  ]
  // await getIPaddresses();
  let badFluxes = [];
  let unreachableFluxes = [];
  let i = 1;
  if (ipsObtained.length > 0) {
    setTimeout(async () => {
      for (const ip of ipsObtained) {
        const fluxVersion = await getFluxVersion(ip);
        if (fluxVersion !== "1.4.0") {
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
      if (zelcashVersion < 4000350) {
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
    const response = await axiosGet(`http://${ip}:16127/zelapps/zelappremove/zelFoldingAtHome`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 3456,
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
    const response = await axiosGet(`http://${ip}:16127/zelapps/zelappremove/DiBiFetch/true`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 43456,
    });
    console.log(response.data)
    return true;
  } catch (error) {
    console.log(error);
    return false
  }
}

async function getApplicationLocations(application) {
  try {
    const ip = '173.212.252.18';
    const response = await axiosGet(`http://${ip}:16127/zelapps/location/${application}`, {
      timeout: 3456,
    });
    const ips = []
    response.data.data.forEach((instance) => {
      ips.push(instance.ip);
    });
    console.log(JSON.stringify(ips))
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
    const response = await axiosGet(`http://${ip}:16127/zelapps/zelappunpause/KadenaChainWebNode`, {
      headers: {
        zelidauth: zelidauthHeader,
      },
      timeout: 3456,
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
    const ips = ["62.171.129.221"];
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


async function massZelCashCheck() {
  loadLogins();
  let i = 0;
  setTimeout(async () => {
    const ipsAll = Object.keys(logins)
    const totalNodes = ipsAll.length;
    const ips = ipsAll;
    console.log(totalNodes);
    for (const ip of ips) {
      i++;
      const zelcashVersion = await getZelCashVersion(ip);
      if (zelcashVersion >= 4000350) {
        console.log('ok');
      } else if (zelcashVersion < 4000350) {
        console.log(ip);
      } else {
        console.log(zelcashVersion)
      }
    }
  }, 2000);
}

// getApplicationLocations('KadenaChainWebNode');
// massPauseKadena()
// massZelCashUpdate2()
// massZelCashCheck();
// massRemoveFolding();
// getOldFoldingAtHomes()
// massStartFolding();
// massFluxUpdate();
// massZelBenchCheck();
// massHardFluxUpdate();
// loadLogins();
// getBadFLuxVersions();
// massCheckNewDatabase();
// setTimeout(() => {
  // removeFolding('68.148.99.182');
  // stopBlockProcessing();
  // massZelBenchUpdate2('77.37.224.231');
  // updateZelFluxTheHardWay('95.179.208.158');
  // massLogin();
 // }, 2000)

// getBadFluxScannedHeights();
// massCheckMessage();
// massRemoveDibiFetch();