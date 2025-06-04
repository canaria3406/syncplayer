let players = []; // Array to store YouTube Player objects

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

function embedVideos() {
    // Clear existing players and iframes
    document.getElementById('video-players').innerHTML = '';
    players = [];

    const urlsText = document.getElementById('youtube-urls').value;
    const urls = urlsText.split('\n').filter(url => url.trim() !== '');

    if (urls.length === 0) {
        alert('請輸入至少一個 YouTube 網址！');
        return;
    }

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
        }
    });
}

function onPlayerReady(event) {
    console.log('Player is ready:', event.target.getVideoUrl());
}

function onPlayerStateChange(event) {
    console.log('Player state changed:', event.data);
}

function playAllVideos() {
    if (players.length === 0) {
        console.log("no players available to play.");
        return;
    }

    // 確保第一個播放器存在且已準備好
    if (players[0] && typeof players[0].getCurrentTime === 'function') {
        const firstVideoCurrentTime = players[0].getCurrentTime(); // 取得第一個影片的當前時間

        const seekPromises = []; // 用來儲存所有 seekTo 操作的 Promise

        players.forEach((player, index) => {
            if (player && typeof player.seekTo === 'function') {
                // 如果不是第一個影片，則將其時間同步到第一個影片的時間
                if (index !== 0) {
                    seekPromises.push(new Promise(resolve => {
                        player.seekTo(firstVideoCurrentTime, true);
                        // 給予 seekTo 處理時間，例如 100 毫秒
                        setTimeout(resolve, 100); // 短暫延遲，讓 seekTo 有時間完成
                    }));
                } else {
                    // 第一個影片也加到 Promise 陣列，這樣可以統一在所有 seekTo 完成後再播放
                    seekPromises.push(Promise.resolve()); // 第一個影片直接 resolve
                }
            } else {
                // 如果播放器還未準備好或沒有 seekTo 方法，也要加入一個已解決的 Promise
                // 以免 Promise.all 永遠等待
                seekPromises.push(Promise.resolve());
            }
        });

        // 當所有 seekTo (或模擬的延遲) 完成後，再統一播放
        Promise.all(seekPromises).then(() => {
            players.forEach(player => {
                if (player && typeof player.playVideo === 'function') {
                    player.playVideo(); // 統一播放所有影片
                }
            });
        }).catch(error => {
            console.error("同步播放時發生錯誤:", error);
        });

    } else {
        console.log("第一個影片播放器尚未準備好，無法同步時間。嘗試直接播放。");
        // 如果第一個播放器未準備好，退而求其次只播放
        players.forEach(player => {
            if (player && typeof player.playVideo === 'function') {
                player.playVideo();
            }
        });
    }
}

function pauseAllVideos() {
    players.forEach(player => {
        if (player && typeof player.pauseVideo === 'function') {
            player.pauseVideo();
        }
    });
}

function clearVideos() {
    document.getElementById('video-players').innerHTML = '';
    document.getElementById('youtube-urls').value = '';
    players = []; // Clear the players array
}

// This code loads the IFrame Player API asynchronously.
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api"; // Correct YouTube API URL
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
