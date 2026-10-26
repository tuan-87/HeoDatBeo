const fs = require('fs');
const path = require('path');

try {
  const versionHistoryPath = path.join(__dirname, 'version_history.json');
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageLockJsonPath = path.join(__dirname, 'package-lock.json');
  const appJsonPath = path.join(__dirname, 'app.json');

  if (!fs.existsSync(versionHistoryPath)) {
    console.error('Error: version_history.json not found!');
    process.exit(1);
  }

  const versionHistory = JSON.parse(fs.readFileSync(versionHistoryPath, 'utf8'));
  if (!Array.isArray(versionHistory) || versionHistory.length === 0) {
    console.error('Error: version_history.json is empty or invalid!');
    process.exit(1);
  }

  const latestVersion = versionHistory[0].version;
  const latestOrder = parseInt(versionHistory[0].order, 10);
  console.log(`Latest app version from history: ${latestVersion} (order/versionCode: ${latestOrder})`);

  // 1. Update package.json
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (packageJson.version !== latestVersion) {
      console.log(`Updating package.json version from ${packageJson.version} to ${latestVersion}`);
      packageJson.version = latestVersion;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
    } else {
      console.log('package.json version is already up to date.');
    }
  } else {
    console.warn('Warning: package.json not found!');
  }

  // 2. Update package-lock.json
  if (fs.existsSync(packageLockJsonPath)) {
    const packageLockJson = JSON.parse(fs.readFileSync(packageLockJsonPath, 'utf8'));
    let updated = false;
    
    if (packageLockJson.version !== latestVersion) {
      console.log(`Updating package-lock.json version from ${packageLockJson.version} to ${latestVersion}`);
      packageLockJson.version = latestVersion;
      updated = true;
    }
    
    if (packageLockJson.packages && packageLockJson.packages[''] && packageLockJson.packages[''].version !== latestVersion) {
      console.log(`Updating package-lock.json packages[""].version from ${packageLockJson.packages[''].version} to ${latestVersion}`);
      packageLockJson.packages[''].version = latestVersion;
      updated = true;
    }
    
    if (updated) {
      fs.writeFileSync(packageLockJsonPath, JSON.stringify(packageLockJson, null, 2) + '\n', 'utf8');
    } else {
      console.log('package-lock.json version is already up to date.');
    }
  } else {
    console.log('package-lock.json not found, skipping.');
  }

  // 3. Update app.json (version & versionCode)
  if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    let appJsonUpdated = false;

    if (appJson.expo) {
      if (appJson.expo.version !== latestVersion) {
        console.log(`Updating app.json expo.version from ${appJson.expo.version} to ${latestVersion}`);
        appJson.expo.version = latestVersion;
        appJsonUpdated = true;
      }

      if (!appJson.expo.android) {
        appJson.expo.android = {};
      }

      if (appJson.expo.android.versionCode !== latestOrder) {
        console.log(`Updating app.json expo.android.versionCode from ${appJson.expo.android.versionCode} to ${latestOrder}`);
        appJson.expo.android.versionCode = latestOrder;
        appJsonUpdated = true;
      }
    }

    if (appJsonUpdated) {
      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
    } else {
      console.log('app.json version and versionCode are already up to date.');
    }
  } else {
    console.warn('Warning: app.json not found!');
  }

  console.log('Version synchronization complete!');
} catch (error) {
  console.error('Error synchronizing versions:', error);
  process.exit(1);
}
