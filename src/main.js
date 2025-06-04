// 在網頁載入完成時執行此函數 (保持之前的邏輯，讓網址參數填充 textarea)
window.addEventListener('DOMContentLoaded', (event) => {
    const textarea = document.getElementById('youtube-urls');
    
    if (!textarea) {
        console.error("找不到 ID 為 'youtube-urls' 的 textarea 元素。");
        return;
    }
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('share')) {
        let shareContent = urlParams.get('share');
        if (shareContent.includes('/n')) {
             shareContent = shareContent.replace(/\/n/g, '\n');
        }
        textarea.value = shareContent;
    }
});


let players = []; // 儲存所有 YouTube 播放器物件的陣列
let playersReadyCount = 0; // 追蹤已準備好的播放器數量
let totalPlayersToLoad = 0; // 記錄預期載入的播放器總數
let isSeeking = false; // 旗標，用於防止在執行 seek 操作時，重複觸發 seek

// Load the YouTube IFrame Player API asynchronously.
function onYouTubeIframeAPIReady() {
    // This function is called once the API is loaded
    // We don't create players immediately, but wait for user input
}

function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// 嵌入 YouTube 影片
function embedVideos() {
    // Clear existing players and iframes
    document.getElementById('video-players').innerHTML = '';
    players = [];
    playersReadyCount = 0; 
    totalPlayersToLoad = 0; 

    // 取得文字輸入框中的 YouTube 網址文字
    const urlsText = document.getElementById('youtube-urls').value;
    const urls = urlsText.split('\n').filter(url => url.trim() !== '');

    // 如果沒有輸入任何網址，則發出提示
    if (urls.length === 0) {
        alert('請輸入至少一個 YouTube 網址！');
        return;
    }

    totalPlayersToLoad = urls.length; // 設定預期載入的播放器總數

    // 嵌入對應的影片
    urls.forEach((url, index) => {
        const videoId = extractVideoId(url);
        if (videoId) {
            const videoPlayersContainer = document.getElementById('video-players'); 
            const videoWrapper = document.createElement('div');
            videoWrapper.className = 'video-wrapper';

            const iframeDivId = `player-${index}`;
            const iframeDiv = document.createElement('div');
            iframeDiv.id = iframeDivId;
            videoWrapper.appendChild(iframeDiv);

            videoPlayersContainer.appendChild(videoWrapper);

            // Create a new YT.Player object
            const player = new YT.Player(iframeDivId, {
                height: '315',
                width: '560',
                videoId: videoId,
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange
                }
            });
            players.push(player); // Store the player object
        } else {
            alert(`無效的 YouTube 網址: ${url}`);
            totalPlayersToLoad--;
        }
    });
}

// 當播放器準備好時
function onPlayerReady(event) {
    console.log('Player is ready:', event.target.getVideoUrl());
    setTimeout(() => {
        event.target.pauseVideo();
        playersReadyCount++;
    }, 300);
}

// 當播放器狀態改變時
function onPlayerStateChange(event) {
    if (event.target === players[0] && !isSeeking) {
        if (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.BUFFERING) {
            if (!event.target.isPaused() || event.data === YT.PlayerState.BUFFERING) {
                synchronizePlayers();
            }
        }
    }
    console.log('Player state changed:', event.data);
}

// 同步所有播放器時間
function synchronizePlayers() {
    // 如果沒有播放器或不是所有播放器都已準備好，則不執行同步
    if (players.length === 0 || playersReadyCount < totalPlayersToLoad) {
        console.log("不是所有播放器都已準備好，或沒有嵌入播放器。");
        return;
    }

    const firstPlayer = players[0]; // 取得第一個播放器
    // 如果第一個播放器不存在或沒有 getCurrentTime 方法，則不執行同步
    if (!firstPlayer || typeof firstPlayer.getCurrentTime !== 'function') {
        console.log("第一個播放器尚未準備好，或缺少 getCurrentTime 方法。");
        return;
    }

    // 取得第一個播放器當前時間 (秒)
    const firstVideoCurrentTime = firstPlayer.getCurrentTime();

    // 設定 isSeeking 旗標為 true，防止在 seek 進行中重複觸發同步
    isSeeking = true;

    const seekPromises = []; // 儲存所有 seekTo 操作的 Promise

    // 遍歷所有播放器 (跳過第一個播放器)
    players.forEach((player, index) => {
        //if (index === 0) return; // 跳過第一個播放器

        // 如果播放器存在且有 seekTo 方法
        if (player && typeof player.seekTo === 'function') {
            seekPromises.push(new Promise(resolve => {
                // 將其他播放器調整到與第一個播放器相同的時間
                player.seekTo(firstVideoCurrentTime, true); // true 表示精確跳轉到指定時間
                // 設定一個短暫延遲，以確保 seek 操作有時間完成
                setTimeout(resolve, 300);
            }));
        } 
    });

    // 等待所有 seek 操作 (或模擬的延遲) 完成後
    Promise.all(seekPromises).then(() => {
        // seek 操作完成，重置 isSeeking 旗標，允許後續同步
        isSeeking = false;

        // 如果第一個播放器正在播放，確保所有其他播放器也開始播放
        if (firstPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
            players.forEach((player, index) => {
                // 如果播放器存在且當前不在播放狀態
                if (player && player.getPlayerState() !== YT.PlayerState.PLAYING) {
                    player.playVideo(); // 統一播放所有影片
                }
            });
        }
    }).catch(error => {
        console.error("同步時發生錯誤:", error);
        isSeeking = false; // 出錯時也要重置 isSeeking 旗標
    });
}

// 播放所有影片
function playAllVideos() {
    if (players.length === 0) {
        console.log("沒有可播放的播放器。");
        return;
    }

    if (playersReadyCount < totalPlayersToLoad) {
        console.log("尚有播放器未準備，請稍候。");
        return;
    }

    // 在播放前先同步所有影片的時間
    const firstVideoCurrentTime = players[0].getCurrentTime(); // 取得第一個影片的當前時間
    const seekPromises = []; // 儲存所有 seekTo 操作的 Promise

    players.forEach((player, index) => {
        if (player && typeof player.seekTo === 'function') {
            seekPromises.push(new Promise(resolve => {
                player.seekTo(firstVideoCurrentTime, true); // 將所有影片跳轉到相同時間
                setTimeout(resolve, 300); // 短暫延遲，確保 seek 操作完成
            }));
        } 
    });

    // 等待所有 seek 操作完成後，再統一播放所有影片
    Promise.all(seekPromises).then(() => {
        players.forEach(player => {
            if (player && typeof player.playVideo === 'function') {
                player.playVideo();
            }
        });
    }).catch(error => {
        console.error("同步播放時發生錯誤:", error);
    });
}

// 暫停所有影片
function pauseAllVideos() {
    players.forEach(player => {
        if (player && typeof player.pauseVideo === 'function') {
            player.pauseVideo();
        }
    });
}

// This code loads the IFrame Player API asynchronously.
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
