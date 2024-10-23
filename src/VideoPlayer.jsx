import React, { useEffect, useRef, useState } from "react";
import dashjs from "dashjs";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, Subtitles } from "lucide-react";

export default function VideoPlayer({ src }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const statsIntervalRef = useRef(null);
  const [player, setPlayer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [qualities, setQualities] = useState([]);
  const [audioTracks, setAudioTracks] = useState([]);
  const [subtitles, setSubtitles] = useState([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isAutoBitrate, setIsAutoBitrate] = useState(true);
  const [currentBitrate, setCurrentBitrate] = useState(0);
  const [currentFps, setCurrentFps] = useState(0);
  const [currentQuality, setCurrentQuality] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('quality');

  // Initialize player
  useEffect(() => {
    if (!videoRef.current) return;
    
    const dashPlayer = dashjs.MediaPlayer().create();
    dashPlayer.initialize(videoRef.current, src, false);
    setIsAutoBitrate(true);
    dashPlayer.updateSettings({
      streaming: {
        buffer :{
          bufferToKeep: 1, // Keep only 5 seconds in the buffer
          bufferPruningInterval: 30 // Prune the buffer every 30 seconds
        },
        abr: {
          autoSwitchBitrate: {
            audio: true,
            video: false // Set to false if you want manual control
        },       
      },
      debug: {
        logLevel: dashjs.Debug.LOG_LEVEL_DEBUG
      },
      },
      debug: {
        logLevel: 1
      }
    });
    setPlayer(dashPlayer);


    return () => {
      if (dashPlayer) {
        dashPlayer.destroy();
      }
    };
  }, [src]);

  // Enhanced stats monitoring
  useEffect(() => {
    if (!player) return;

    const updateStats = () => {
      try {
        const currentQualityLevel = player.getQualityFor("video");
        const bitrateInfoList = player.getBitrateInfoListFor("video");
        
        if (bitrateInfoList && bitrateInfoList[currentQualityLevel]) {
          const bitrateInfo = bitrateInfoList[currentQualityLevel];
          const currentBitrate = player.getAverageThroughput("video");
          const maxBitrate = bitrateInfo ? bitrateInfo.bitrate : 0;
          const actualBitrate = Math.min(currentBitrate, maxBitrate);
          setCurrentBitrate(Math.round(actualBitrate / 1000));
          setCurrentQuality(currentQualityLevel);
        }
      } catch (error) {
        console.error("Error updating stats:", error);
      }
    };

    // Update stats immediately and set interval
    updateStats();
    statsIntervalRef.current = setInterval(updateStats, 1000);

    const onStreamInitialized = () => {
      setQualities(player.getBitrateInfoListFor("video"));
      setAudioTracks(player.getTracksFor("audio"));
      setSubtitles(player.getTracksFor("text"));
      updateStats(); // Update stats when stream is initialized
    };

    const onQualityChanged = () => {
      updateStats(); // Update stats when quality changes
    };

    player.on("streamInitialized", onStreamInitialized);
    player.on("qualityChangeRendered", onQualityChanged);
    player.on("playbackTimeUpdated", (e) => setCurrentTime(e.time));
    player.on("playbackMetaDataLoaded", () => setDuration(player.duration()));

  
    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
      player.off("streamInitialized", onStreamInitialized);
      player.off("qualityChangeRendered", onQualityChanged);
    };
  }, [player]);

  // Controls visibility
  useEffect(() => {
    let timeout;
    const resetTimeout = () => {
      clearTimeout(timeout);
      setShowControls(true);
      timeout = setTimeout(() => {
        setShowControls(false);
        setShowSettings(false);
        setShowSubtitles(false);
      }, 3000);
    };

    const container = containerRef.current;
    container.addEventListener("mousemove", resetTimeout);
    container.addEventListener("mouseleave", () => {
      setShowControls(false);
      setShowSettings(false);
      setShowSubtitles(false);
    });

    resetTimeout();

    return () => {
      clearTimeout(timeout);
      container?.removeEventListener("mousemove", resetTimeout);
    };
  }, []);

  const handleSeekReset = () => {
    if (videoRef.current) {
      const playbackQuality = videoRef.current.getVideoPlaybackQuality();
      setCurrentFps(0); // Reset FPS to 0 temporarily after seeking

      // Store initial frames and time for recalculation after seek
      videoRef.current.initialFrames = playbackQuality.totalVideoFrames || 0;
      videoRef.current.initialTime = videoRef.current.currentTime || 0;
    }
  };

  // Monitor playback to calculate FPS
  useEffect(() => {
    const calculateFPS = () => {
      if (videoRef.current) {
        const playbackQuality = videoRef.current.getVideoPlaybackQuality();
        const currentTime = videoRef.current.currentTime;

        const initialFrames = videoRef.current.initialFrames || 0;
        const initialTime = videoRef.current.initialTime || 0;

        // Avoid divide by zero and negative time differences
        if (currentTime > initialTime) {
          const framesSinceSeek = playbackQuality.totalVideoFrames - initialFrames;
          const timeSinceSeek = currentTime - initialTime;

          // Calculate FPS based on frames and time since last seek
          const fps = framesSinceSeek / timeSinceSeek;
          setCurrentFps(Math.round(fps));
        }
      }
    };

    const fpsInterval = setInterval(calculateFPS, 1000); // Update FPS every second

    return () => {
      clearInterval(fpsInterval); // Clean up the interval on unmount
    };
  }, []); // Empty dependency array means this runs once after component mounts

  // Handle 'seeked' event to reset FPS tracking
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.addEventListener('seeked', handleSeekReset);

      return () => {
        videoRef.current.removeEventListener('seeked', handleSeekReset);
      };
    }
  }, [videoRef.current]); // Re-run when videoRef changes


  const handlePlayPause = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    player.setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

   // Enhanced quality change handler
   const handleQualityChange = (qualityIndex) => {
    if (!player) return;

    const currentTime = player.time();
    const wasPlaying = !player.isPaused();


    if (qualityIndex === "auto") {
      setIsAutoBitrate(true);
      player.updateSettings({
        streaming: { 
          abr: { 
            autoSwitchBitrate: true,
          }
        }
      });
    } else {
      setIsAutoBitrate(false);
      player.updateSettings({
        streaming: {
          buffer :{
            bufferToKeep: 1, // Keep only 5 seconds in the buffer
            bufferPruningInterval: 30 // Prune the buffer every 30 seconds
          },
          abr: {
            autoSwitchBitrate: {
              audio: true,
              video: false // Set to false if you want manual control
          },       
        },
        }
      });

      player.setQualityFor("video", parseInt(qualityIndex));
    }

    // Ensure smooth playback after quality change
    setTimeout(() => {
      player.seek(currentTime);
      if (wasPlaying) {
        player.play();
      }
    }, 100);

    setShowSettings(false);
  };

  // Enhanced track change handlers
  const handleAudioTrackChange = (trackId) => {
    const currentTime = player.time();
    const wasPlaying = !player.isPaused();
    
    const selectedTrack = audioTracks.find(track => 
      (track.id !== undefined ? track.id : track.index) === trackId
    );
    
    if (selectedTrack) {
      player.setCurrentTrack(selectedTrack);
      
      setTimeout(() => {
        player.seek(currentTime);
        if (wasPlaying) {
          player.play();
        }
      }, 100);
    }
    
    setShowSettings(false);
  };

  const handleSeek = (time) => {
    if (player) {
      player.seek(time);
      setCurrentTime(time); // Update local state if needed
      console.log("as")
    }
  };
  

  const handleSubtitleChange = (trackId) => {
    const currentTime = player.time();
    const wasPlaying = !player.isPaused();
    
    if (trackId === "off") {
      player.setTextTrack(-1);
    } else {
      const selectedTrack = subtitles.find(track => 
        (track.id !== undefined ? track.id : track.index) === trackId
      );
      if (selectedTrack) {
        player.setCurrentTrack(selectedTrack);
      }
    }
    
    setTimeout(() => {
      player.seek(currentTime);
      if (wasPlaying) {
        player.play();
      }
    }, 100);
    
    setShowSubtitles(false);
  };

  const formatTime = (time) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);    
    return `${hours > 0 ? hours.toString().padStart(2, "0") + ':' : ''}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };
  
  const SettingsPanel = () => (
    <div className="absolute bottom-32 right-4 bg-black bg-opacity-90 text-white rounded-lg p-2 min-w-48">
      <div className="flex space-x-2 border-b border-gray-700 pb-2 mb-2">
        <button
          className={`px-3 py-1 rounded ${activeSettingsTab === 'quality' ? 'bg-blue-500' : ''}`}
          onClick={() => setActiveSettingsTab('quality')}
        >
          Quality
        </button>
        <button
          className={`px-3 py-1 rounded ${activeSettingsTab === 'audio' ? 'bg-blue-500' : ''}`}
          onClick={() => setActiveSettingsTab('audio')}
        >
          Audio
        </button>
      </div>
      
      {activeSettingsTab === 'quality' && (
        <div className="space-y-1">
          <button
            className={`w-full text-left px-3 py-1 hover:bg-gray-700 rounded ${isAutoBitrate ? 'bg-gray-700' : ''}`}
            onClick={() => handleQualityChange("auto")}
          >
            Auto
          </button>
          {qualities.map((quality) => (
            <button
              key={quality.qualityIndex}
              className={`w-full text-left px-3 py-1 hover:bg-gray-700 rounded ${currentQuality === quality.qualityIndex && !isAutoBitrate ? 'bg-gray-700' : ''}`}
              onClick={() => handleQualityChange(quality.qualityIndex)}
            >
              {quality.height}p
            </button>
          ))}
        </div>
      )}

      {activeSettingsTab === 'audio' && (
        <div className="space-y-1">
          {audioTracks.map((track) => (
            <button
              key={track.id || track.index}
              className="w-full text-left px-3 py-1 hover:bg-gray-700 rounded"
              onClick={() => handleAudioTrackChange(track.id || track.index)}
            >
              {track.labels?.[0]?.text || track.lang || `Audio ${track.index + 1}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const SubtitlesPanel = () => (
    <div className="absolute bottom-32 right-36 bg-black bg-opacity-90 text-white rounded-lg p-2 min-w-48">
      <button
        className="w-full text-left px-3 py-1 hover:bg-gray-700 rounded"
        onClick={() => handleSubtitleChange("off")}
      >
        Off
      </button>
      {subtitles.map((track) => (
        <button
          key={track.id || track.index}
          className="w-full text-left px-3 py-1 hover:bg-gray-700 rounded"
          onClick={() => handleSubtitleChange(track.id || track.index)}
        >
          {track.labels?.[0]?.text || track.lang || `Subtitle ${track.index + 1}`}
        </button>
      ))}
    </div>
  );

  return (
    <div ref={containerRef} className={`w-full max-w-6xl mx-auto mt-10 bg-gray-900 p-4 rounded-lg shadow-md relative ${isFullScreen ? 'h-screen' : 'h-3xl'}`}>
      <div className="relative">
        <video
          ref={videoRef}
          className={`w-full bg-black rounded-md ${isFullScreen ? 'h-screen' : ''}`}
        />
        
        {/* Stats overlay */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white px-3 py-2 rounded text-xs font-mono">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between space-x-4">
              <span className="text-gray-400">Bitrate:</span>
              <span className="text-green-400">{currentBitrate} Kbps</span>
            </div>
            <div className="flex items-center justify-between space-x-4">
              <span className="text-gray-400">FPS:</span>
              <span className="text-blue-400">{Math.round(currentFps)}</span>
            </div>
            {currentQuality !== null && qualities[currentQuality] && (
              <div className="flex items-center justify-between space-x-4">
                <span className="text-gray-400">Quality:</span>
                <span className="text-yellow-400">{qualities[currentQuality].height}p</span>
              </div>
            )}
          </div>
        </div>

        {/* Controls overlay */}
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center justify-between mb-4">
            <button
              className="p-2 rounded-full hover:bg-gray-700 transition text-white	"
              onClick={handlePlayPause}
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </button>

            <div className="flex items-center space-x-4">
              <button
                className="p-2 rounded-full hover:bg-gray-700 transition text-white	"
                onClick={() => setShowSubtitles(!showSubtitles)}
              >
                <Subtitles className="h-6 w-6" />
              </button>

              <button
                className="p-2 rounded-full hover:bg-gray-700 transition text-white	"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-6 w-6" />
              </button>

              <div className="flex items-center space-x-2 text-white	">
                <button
                  className="p-2 rounded-full hover:bg-gray-700 transition"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-24 accent-white"
                />
              </div>

              <button
                className="p-2 rounded-full hover:bg-gray-700 transition text-white	" 
                onClick={() => {
                  if (!isFullScreen) {
                    containerRef.current.requestFullscreen();
                  } else {
                    document.exitFullscreen();
                  }
                  setIsFullScreen(!isFullScreen);
                }}
              >
                {isFullScreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative">
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-600 appearance-none rounded cursor-pointer"
              style={{
                background: `linear-gradient(to right, white ${(currentTime / duration) * 100}%, gray ${(currentTime / duration) * 100}%)`
              }}
            />
            <div className="flex justify-between text-sm mt-2 text-white	">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && <SettingsPanel />}

        {/* Subtitles Panel */}
        {showSubtitles && <SubtitlesPanel />}
      </div>
    </div>
  );
}