export async function captureImage(): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.setAttribute('autoplay', 'true');
    video.style.display = 'none'; // Hide the video element

    const canvas = document.createElement('canvas');

    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        video.srcObject = stream;
        document.body.appendChild(video); // Append to the body to ensure it's in the DOM

        video.addEventListener('loadedmetadata', () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

          const imageDataURL = canvas.toDataURL('image/png');

          stream.getTracks().forEach(track => track.stop());
          document.body.removeChild(video); // Clean up the video element
          resolve(imageDataURL);
        });
      })
      .catch((err) => {
        document.body.removeChild(video); // Clean up the video element in case of error
        reject(err);
      });
  });
}
