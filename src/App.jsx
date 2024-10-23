import React , { useState } from "react";
import VideoPlayer from "./VideoPlayer";

export default function App() {
  const [videoSrc, setVideoSrc] = useState("https://s3.ap-south-1.amazonaws.com/nextgen.videos/chuttamalle/final.mpd");

  const handleVideoChange = (src) => {
    setVideoSrc(src);
  };

  return (
    <div className="min-h-screen w-full bg-gray-100 flex items-center justify-center">
      <div className="container h-[90vh] mx-auto flex flex-col px-4">
        <h1 className="text-3xl font-bold text-center h-1/6 text-gray-800 mb-8">
          Dash Video Player
        </h1>

        {/* Buttons to change video source */}
        <div className="flex justify-center space-x-4 mb-4">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded"
            onClick={() => handleVideoChange("https://s3.ap-south-1.amazonaws.com/nextgen.videos/chuttamalle/final.mpd")}
          >
            Play Chuttamalle
          </button>
          <button
            className="px-4 py-2 bg-green-500 text-white rounded"
            onClick={() => handleVideoChange("https://s3.ap-south-1.amazonaws.com/nextgen.videos/chaleya/final.mpd")}
          >
            Play Chaleya
          </button>
        </div>

        {/* Video player */}
        <VideoPlayer src={videoSrc} className="h-5/6" />
      </div>
    </div>
  );
}