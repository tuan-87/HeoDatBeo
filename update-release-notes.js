const fs = require('fs');
const path = require('path');

async function main() {
  const versionHistoryPath = path.join(__dirname, 'version_history.json');
  const serviceAccountPath = path.join(__dirname, 'google-service-account.json');

  if (!fs.existsSync(versionHistoryPath)) {
    console.error('Không tìm thấy file version_history.json!');
    return;
  }

  if (!fs.existsSync(serviceAccountPath)) {
    console.error('Không tìm thấy file google-service-account.json! Bỏ qua cập nhật release notes.');
    return;
  }

  const versionHistory = JSON.parse(fs.readFileSync(versionHistoryPath, 'utf8'));
  if (!Array.isArray(versionHistory) || versionHistory.length === 0) {
    console.error('version_history.json rỗng!');
    return;
  }

  const latestRelease = versionHistory[0];
  const notesText = latestRelease.description || '';
  const version = latestRelease.version || '';
  const packageName = 'com.satsboy87.heodatbeo';

  console.log(`=======================================================`);
  console.log(`📌 Phiên bản cập nhật: ${version}`);
  console.log(`📝 Nội dung cập nhật (Release Notes):\n${notesText}`);
  console.log(`=======================================================`);

  if (!notesText.trim()) {
    console.log('Không có mô tả cập nhật nào để đẩy lên Google Play.');
    return;
  }

  // Load GoogleAuth dynamically
  const { GoogleAuth } = require('google-auth-library');

  const auth = new GoogleAuth({
    keyFile: serviceAccountPath,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  const client = await auth.getClient();

  // 1. Tạo Edit session mới
  console.log('1. Đang tạo edit session với Google Play Developer API...');
  const createEditRes = await client.request({
    url: `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits`,
    method: 'POST',
  });

  const editId = createEditRes.data.id;
  console.log(`-> Edit session ID: ${editId}`);

  // 2. Lấy thông tin track production
  console.log('2. Đang kiểm tra track production...');
  const trackRes = await client.request({
    url: `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits/${editId}/tracks/production`,
    method: 'GET',
  });

  const releases = trackRes.data.releases || [];
  if (releases.length === 0) {
    console.log('Chưa tìm thấy bản release nào trên track production để cập nhật.');
    return;
  }

  console.log(`-> Tìm thấy ${releases.length} bản release trên track production.`);

  // Cập nhật releaseNotes cho bản release mới nhất (đầu danh sách)
  releases[0].releaseNotes = [
    {
      language: 'vi-VN',
      text: notesText,
    },
  ];

  // 3. Cập nhật lại track production với releaseNotes mới
  console.log('3. Đang cập nhật nội dung Release Notes cho bản phát hành...');
  await client.request({
    url: `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits/${editId}/tracks/production`,
    method: 'PUT',
    data: {
      track: 'production',
      releases: releases,
    },
  });

  // 4. Commit edit session
  console.log('4. Đang commit thay đổi lên Google Play Store...');
  await client.request({
    url: `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits/${editId}:commit`,
    method: 'POST',
  });

  console.log('🎉 THÀNH CÔNG: Đã tự động cập nhật mô tả tính năng mới lên Google Play Store!');
}

main().catch((err) => {
  console.warn('⚠️ Cảnh báo khi cập nhật Release Notes:');
  console.warn(err?.response?.data || err?.message || err);
  // Không làm fail toàn bộ tiến trình CI nếu chỉ lỗi phần cập nhật text
  process.exit(0);
});
