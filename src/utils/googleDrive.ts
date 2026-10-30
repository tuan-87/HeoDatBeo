import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { storage } from '../store/storage';

const GOOGLE_CLIENT_ID = '765227702920-f9kg547udkvej555u1if39teneaa61l3.apps.googleusercontent.com';
const BACKUP_FOLDER_NAME = 'data_heo_dat_beo';

export interface GoogleDriveBackupInfo {
  success: boolean;
  message: string;
}

/**
 * Cấu hình Google Sign-In
 */
export const initGoogleDrive = () => {
  GoogleSignin.configure({
    scopes: ['https://www.googleapis.com/auth/drive.file'],
    webClientId: GOOGLE_CLIENT_ID,
    offlineAccess: true,
  });
};

/**
 * Đăng nhập Google
 */
export const signInGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const res = await GoogleSignin.signIn();
    if (res.type === 'success') {
      const tokens = await GoogleSignin.getTokens();
      return {
        success: true,
        userInfo: res.data,
        accessToken: tokens.accessToken,
      };
    } else {
      return {
        success: false,
        error: 'Đăng nhập bị hủy bởi người dùng.',
      };
    }
  } catch (error: any) {
    console.error('Lỗi đăng nhập Google Sign-In:', error);
    const codeStr = error?.code != null ? `[Mã lỗi: ${error.code}] ` : '';
    const errMsg = error?.message || String(error);
    return {
      success: false,
      error: `${codeStr}${errMsg}`,
    };
  }
};

/**
 * Đăng xuất Google
 */
export const signOutGoogle = async () => {
  try {
    await GoogleSignin.signOut();
    return { success: true };
  } catch (error: any) {
    console.error('Lỗi đăng xuất Google:', error);
    return { success: false, error: error.message };
  }
};

let activeTokenPromise: Promise<string | null> | null = null;

/**
 * Lấy Access Token hiện tại (tự động làm mới nếu hết hạn, tránh gọi đồng thời)
 */
export const getAccessToken = async (): Promise<string | null> => {
  if (activeTokenPromise) {
    return activeTokenPromise;
  }

  activeTokenPromise = (async () => {
    try {
      const hasPrevious = GoogleSignin.hasPreviousSignIn();
      if (!hasPrevious) {
        // Thử đăng nhập âm thầm để phục hồi session
        const silentRes = await GoogleSignin.signInSilently();
        if (silentRes.type !== 'success') return null;
      }
      const tokens = await GoogleSignin.getTokens();
      return tokens.accessToken;
    } catch (error) {
      console.error('Lỗi lấy Access Token:', error);
      return null;
    } finally {
      activeTokenPromise = null;
    }
  })();

  return activeTokenPromise;
};

const getOrCreateBackupFolder = async (accessToken: string): Promise<string | null> => {
  try {
    // 1. Tìm kiếm folder
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!searchResponse.ok) {
      const errText = await searchResponse.text();
      console.error('Lỗi khi tìm kiếm folder Google Drive:', errText);
      return null;
    }

    const searchData = await searchResponse.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // 2. Không tìm thấy -> Tạo folder mới
    const createUrl = 'https://www.googleapis.com/drive/v3/files';
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: BACKUP_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!createResponse.ok) {
      const errText = await createResponse.text();
      console.error('Lỗi khi tạo folder Google Drive:', errText);
      return null;
    }

    const createData = await createResponse.json();
    return createData.id || null;
  } catch (error) {
    console.error('Lỗi tìm/tạo folder Google Drive:', error);
    return null;
  }
};

/**
 * Thực hiện sao lưu dữ liệu hiện tại lên Google Drive và dọn dẹp dữ liệu cũ (chỉ giữ lại 3 bản sao lưu mới nhất khi đạt tối đa 20 bản)
 * @param dataStr Dữ liệu backup dạng JSON chuỗi
 */
export const uploadBackupToGoogleDrive = async (dataStr: string): Promise<GoogleDriveBackupInfo> => {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return { success: false, message: 'Chưa đăng nhập tài khoản Google hoặc phiên làm việc đã hết hạn.' };
    }

    const folderId = await getOrCreateBackupFolder(accessToken);
    if (!folderId) {
      return { success: false, message: 'Không thể tạo hoặc truy cập thư mục lưu trữ trên Google Drive.' };
    }

    // 1. Sinh tên file theo ngày + UTC giây hiện tại: heodatbeo_YYYY-MM-DD_<unix_s>.txt
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const utcSeconds = Math.floor(Date.now() / 1000);
    const fileName = `heodatbeo_${year}-${month}-${day}_${utcSeconds}.txt`;

    // 2. Mỗi lần backup sẽ tạo file mới (không ghi đè), tên file đã là duy nhất theo giây
    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const method = 'POST';

    const boundary = 'heo_dat_beo_backup_boundary';
    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: 'text/plain',
    };

    const multipartBody =
      `\r\n--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: text/plain; charset=UTF-8\r\n\r\n` +
      `${dataStr}\r\n` +
      `--${boundary}--`;

    const uploadResponse = await fetch(uploadUrl, {
      method: method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload thất bại: ${errorText}`);
    }

    // 4. Dọn dẹp dữ liệu cũ: Nếu số lượng file sao lưu đạt tối đa 20, xóa 17 bản cũ nhất, chỉ giữ lại 3 bản mới nhất
    const listFilesUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and mimeType='text/plain' and name contains 'heodatbeo_' and trashed=false&orderBy=name desc&pageSize=100`;
    const listResponse = await fetch(listFilesUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const listData = await listResponse.json();
    if (listData.files && listData.files.length >= 20) {
      const filesToDelete = listData.files.slice(3); // Giữ lại 3 bản sao lưu mới nhất, xóa các bản sao lưu cũ hơn
      for (const file of filesToDelete) {
        try {
          await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          console.log(`Đã xóa file backup cũ: ${file.name}`);
        } catch (delErr) {
          console.error(`Không thể xóa file backup cũ ${file.name}:`, delErr);
        }
      }
    }

    return {
      success: true,
      message: 'Đã sao lưu dữ liệu lên Google Drive thành công.',
    };
  } catch (error: any) {
    console.error('Lỗi khi sao lưu dữ liệu lên Google Drive:', error);
    return {
      success: false,
      message: error.message || String(error),
    };
  }
};

let isAutoBackupRunning = false;

/**
 * Kiểm tra và thực hiện tự động sao lưu nếu bật chế độ tự động và thời gian hiện tại thoả mãn (mỗi ngày một lần, sau 1h sáng)
 */
export const checkAndRunAutoBackup = async () => {
  if (isAutoBackupRunning) return;
  isAutoBackupRunning = true;
  try {
    const isEnabled = await storage.isGoogleDriveAutoBackupEnabled();
    if (!isEnabled) return;

    const token = await getAccessToken();
    if (!token) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    // Chỉ thực hiện tự động sao lưu sau 1h sáng
    if (now.getHours() < 1) return;

    // 1. Kiểm tra local storage trước để tránh gọi API Google Drive nhiều lần không cần thiết
    const lastBackupTs = await storage.getGoogleDriveLastBackupTimestamp();
    const lastBackupStatus = await storage.getGoogleDriveLastBackupStatus();
    if (lastBackupTs !== 0 && lastBackupStatus === 'success') {
      const lastBackupDate = new Date(lastBackupTs);
      const ly = lastBackupDate.getFullYear();
      const lm = String(lastBackupDate.getMonth() + 1).padStart(2, '0');
      const ld = String(lastBackupDate.getDate()).padStart(2, '0');
      const lastBackupDateStr = `${ly}-${lm}-${ld}`;
      if (lastBackupDateStr === todayStr) {
        // Đã có sao lưu thành công ngày hôm nay được lưu locally -> bỏ qua
        return;
      }
    }

    // 2. Kiểm tra trên Google Drive xem đã có bản sao lưu nào ngày hôm nay chưa
    console.log('Đang kiểm tra phiên bản sao lưu hôm nay trên Google Drive...');
    const driveBackup = await checkLatestBackupOnGoogleDrive();
    if (driveBackup && driveBackup.success && driveBackup.timestamp) {
      const driveBackupDate = new Date(driveBackup.timestamp);
      const dy = driveBackupDate.getFullYear();
      const dm = String(driveBackupDate.getMonth() + 1).padStart(2, '0');
      const dd = String(driveBackupDate.getDate()).padStart(2, '0');
      const driveBackupDateStr = `${dy}-${dm}-${dd}`;

      if (driveBackupDateStr === todayStr) {
        // Nếu rồi thì lấy đó là bản sao lưu mới nhất, lưu thành thông tin sao lưu mới nhất
        await storage.setGoogleDriveLastBackupTimestamp(driveBackup.timestamp);
        await storage.setGoogleDriveLastBackupStatus('success');
        console.log('Hôm nay đã có bản sao lưu trên Google Drive. Cập nhật thông tin sao lưu mới nhất và bỏ qua tự động sao lưu.');
        return;
      }
    }

    // 3. Nếu chưa có bản sao lưu nào ngày hôm nay -> Tiến hành sao lưu tự động
    console.log('Bắt đầu tự động sao lưu dữ liệu lên Google Drive...');
    const dataStr = await storage.exportData();
    const res = await uploadBackupToGoogleDrive(dataStr);
    const backupTime = Date.now();
    await storage.setGoogleDriveLastBackupTimestamp(backupTime);
    await storage.setGoogleDriveLastBackupStatus(res.success ? 'success' : 'failed');
    console.log('Kết quả tự động sao lưu:', res.message);
  } catch (e) {
    console.error('Lỗi trong quá trình tự động sao lưu:', e);
  } finally {
    isAutoBackupRunning = false;
  }
};

/**
 * Lấy thông tin chi tiết bản sao lưu mới nhất trên Google Drive (tên file và mốc thời gian)
 */
export const getLatestBackupDetailsOnGoogleDrive = async (): Promise<{ success: boolean; message: string; name?: string; timestamp?: number }> => {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return { success: false, message: 'Chưa đăng nhập tài khoản Google hoặc phiên làm việc đã hết hạn.' };
    }

    const folderId = await getOrCreateBackupFolder(accessToken);
    if (!folderId) {
      return { success: false, message: 'Không thể truy cập thư mục lưu trữ trên Google Drive.' };
    }

    const listFilesUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and mimeType='text/plain' and name contains 'heodatbeo_' and trashed=false&orderBy=name desc&pageSize=1`;
    const listResponse = await fetch(listFilesUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listResponse.ok) {
      const errText = await listResponse.text();
      return { success: false, message: `Không thể tìm danh sách bản sao lưu: ${errText}` };
    }

    const listData = await listResponse.json();
    if (!listData.files || listData.files.length === 0) {
      return { success: false, message: 'Không tìm thấy bản sao lưu nào trên tài khoản Google Drive của bạn.' };
    }

    const latestFile = listData.files[0];
    let fileTimestamp = Date.now();
    const match = latestFile.name.match(/_(\d+)\.txt$/);
    if (match) {
      fileTimestamp = parseInt(match[1], 10) * 1000;
    }

    return {
      success: true,
      message: 'Lấy thông tin bản sao lưu mới nhất thành công.',
      name: latestFile.name,
      timestamp: fileTimestamp,
    };
  } catch (error: any) {
    console.error('Lỗi khi lấy thông tin bản sao lưu từ Google Drive:', error);
    return {
      success: false,
      message: error.message || String(error),
    };
  }
};

/**
 * Tải xuống và khôi phục bản sao lưu mới nhất từ Google Drive
 */
export const restoreLatestBackupFromGoogleDrive = async (): Promise<{ success: boolean; message: string; content?: string; timestamp?: number }> => {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return { success: false, message: 'Chưa đăng nhập tài khoản Google hoặc phiên làm việc đã hết hạn.' };
    }

    const folderId = await getOrCreateBackupFolder(accessToken);
    if (!folderId) {
      return { success: false, message: 'Không thể truy cập thư mục lưu trữ trên Google Drive.' };
    }

    // 1. Quét tìm file backup mới nhất trong thư mục
    const listFilesUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and mimeType='text/plain' and name contains 'heodatbeo_' and trashed=false&orderBy=name desc&pageSize=1`;
    const listResponse = await fetch(listFilesUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listResponse.ok) {
      const errText = await listResponse.text();
      return { success: false, message: `Không thể tìm danh sách bản sao lưu: ${errText}` };
    }

    const listData = await listResponse.json();
    if (!listData.files || listData.files.length === 0) {
      return { success: false, message: 'Không tìm thấy bản sao lưu nào trên tài khoản Google Drive của bạn.' };
    }

    const latestFile = listData.files[0];
    const fileId = latestFile.id;

    let fileTimestamp = Date.now();
    const match = latestFile.name.match(/_(\d+)\.txt$/);
    if (match) {
      fileTimestamp = parseInt(match[1], 10) * 1000;
    }

    // 2. Tải nội dung file
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const downloadResponse = await fetch(downloadUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!downloadResponse.ok) {
      const errText = await downloadResponse.text();
      return { success: false, message: `Không thể tải dữ liệu sao lưu: ${errText}` };
    }

    const fileContent = await downloadResponse.text();
    return {
      success: true,
      message: 'Tải bản sao lưu thành công.',
      content: fileContent,
      timestamp: fileTimestamp
    };
  } catch (error: any) {
    console.error('Lỗi khi khôi phục dữ liệu từ Google Drive:', error);
    return {
      success: false,
      message: error.message || String(error),
    };
  }
};

/**
 * Kiểm tra xem trên Google Drive đã có folder data_heo_dat_beo và có bản sao lưu nào gần nhất không.
 */
export const checkLatestBackupOnGoogleDrive = async (): Promise<{ success: boolean; timestamp?: number } | null> => {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return null;

    // 1. Tìm folder data_heo_dat_beo
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!searchResponse.ok) return null;
    const searchData = await searchResponse.json();
    if (!searchData.files || searchData.files.length === 0) {
      return null;
    }

    const folderId = searchData.files[0].id;

    // 2. Quét tìm file backup mới nhất trong thư mục
    const listFilesUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and mimeType='text/plain' and name contains 'heodatbeo_' and trashed=false&orderBy=name desc&pageSize=1`;
    const listResponse = await fetch(listFilesUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listResponse.ok) return null;
    const listData = await listResponse.json();
    if (!listData.files || listData.files.length === 0) {
      return null;
    }

    const latestFile = listData.files[0];
    let fileTimestamp = Date.now();
    const match = latestFile.name.match(/_(\d+)\.txt$/);
    if (match) {
      fileTimestamp = parseInt(match[1], 10) * 1000;
    }

    return {
      success: true,
      timestamp: fileTimestamp,
    };
  } catch (error) {
    console.error('Lỗi khi kiểm tra bản sao lưu trên Google Drive:', error);
    return null;
  }
};


