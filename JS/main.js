  // Set up Microphone class
  class Microphone
  {
    constructor(sampleRate = 44100, bufferLength = 4096) // sampleRate = 44100, bufferLength = 4096
    {
      console.log("constructor called");
      this._sampleRate = sampleRate; // sampleRate is the sampling rate of the microphone
      // Shorter buffer length results in a more responsive visualization
      this._bufferLength = bufferLength; // bufferLength is how long each buffer of audio data is for processing

      this._audioContext = new AudioContext(); // set up a new audioContext
      this._bufferSource = null; //
      this._streamSource = null; //
      this._scriptNode = null; //

      this._realtimeBuffer = []; //
      this._audioBuffer = []; //
      this._audioBufferSize = 0; //

      this._isRecording = false; // flag to say if a recording is recording or not

      this._setup(this._bufferLength, this._isRecording); // call setup function passing the length of the audio buffers and the recording flag
    };

    get realtimeBuffer() // Getter function for the realtimeBuffer property [Not called]
    {
      console.log("realtimeBuffer called");
      return this._realtimeBuffer;
    }

    get isRecording() // Getter function for the isRecording property
    {
      console.log("isRecording called");
      return this._isRecording;
    }

    _validateSettings()
    {
      console.log("_validateSettings called");
      if (!Number.isInteger(this._sampleRate) || this._sampleRate < 22050 || this._sampleRate > 96000) { // Check if the sample rate is an integer between 22050 and 96000
        throw "Please input an integer samplerate value between 22050 to 96000"; // If it isn't throw this error
    }

    this._validateBufferLength();
    }

    _validateBufferLength()
    {
      console.log("_validateBufferLength called");
      const acceptedBufferLength = [256, 512, 1024, 2048, 4096, 8192, 16384] // list of acceptable buffer lengths
      if (!acceptedBufferLength.includes(this._bufferLength)) // checks if the given buffer length is within the acceptable range
      {
        throw "Please ensure that the buffer length is one of the following values: " + acceptedBufferLength; // throw an error if the buffer length is out of range
      }
    }

    _setup(bufferLength, isRecording)
    {
      console.log("_setup called");
      this._validateSettings(); // call _validateSettings function to check if the sample right is within an appropriate range

      // Get microphone access
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => { // request access to the users microphone and set up a stream
          this._streamSource = this._audioContext.createMediaStreamSource(stream); // create a stream source
          this._scriptNode = this._audioContext.createScriptProcessor(bufferLength, 1, 1); // create a script processor node of bufferLength 4096 and only 1 channel for direct audio processing
          this._bufferSource = this._audioContext.createBufferSource(); // cretes anaudio buffer source node which is can be use to play/access data in an audio buffer
          this._streamSource.connect(this._scriptNode); // connect the stream to ScriptProcessor (Analysis) node
          this._bufferSource.connect(this._audioContext.destination); // connect the buffer to the destination (speaker) node
        }).catch ((e) => {
          throw "Microphone: " + e.name + ". " + e.message; // throw errors with message
        })
      } else {
        throw "MediaDevices are not supported in this browser, please update your browser"; // throw error if mediaDevices is not supported
      }
    }

  processAudio() {
    console.log("processAudio called");
    // Whenever onaudioprocess event is dispatched it creates a buffer array with the length bufferLength
    this._scriptNode.onaudioprocess = (audioProcessingEvent) => {
      if (!this._isRecording) return;
      //console.log("ONAUDIOPROCESS event occurred!");
      this._realtimeBuffer = audioProcessingEvent.inputBuffer.getChannelData(0);

      // Create an array of buffer array until the user finishes recording
      this._audioBuffer.push(this._realtimeBuffer);
      this._audioBufferSize += this._bufferLength;
    }
  }

  playback() {
    console.log("playback called");
    this._setBuffer().then((bufferSource) => {
      bufferSource.start();
    }).catch((e) => {
      throw "Error playing back audio: " + e.name + ". " + e.message;
    })
  }

  _setBuffer() {
    console.log("_setBuffer called");
    return new Promise((resolve, reject) => {
      // New AudioBufferSourceNode needs to be created after each call to start()
      this._bufferSource = this._audioContext.createBufferSource();
      this._bufferSource.connect(this._audioContext.destination);

      console.log(this._audioBuffer);
      console.log(this._audioBufferSize);
      let mergedBuffer = this._mergeBuffers(this._audioBuffer, this._audioBufferSize);
      console.log(mergedBuffer);
      let arrayBuffer = this._audioContext.createBuffer(1, mergedBuffer.length, this._sampleRate);
      let buffer = arrayBuffer.getChannelData(0);

      for (let i = 0, len = mergedBuffer.length; i < len; i++) {
        buffer[i] = mergedBuffer[i];
      }

      this._bufferSource.buffer = arrayBuffer;

      resolve(this._bufferSource);
    })
  }

  _mergeBuffers(bufferArray, bufferSize) {
    console.log("_mergeBuffers called");
    // Not merging buffers because there is less than 2 buffers from onaudioprocess event and hence no need to merge
    if (bufferSize < 2) return;
    let result = new Float32Array(bufferSize);

    for (let i = 0, len = bufferArray.length, offset = 0; i < len; i++) {
      result.set(bufferArray[i], offset);
      offset += bufferArray[i].length;
    }
    return result;
  }

  startRecording() {
    console.log("startRecording called");
    if (this._isRecording) return;

    this._clearBuffer();
    this._isRecording = true;
  }

  stopRecording() {
    console.log("stopRecording called");
    if (!this._isRecording) {
      console.log("About to clear buffer");
      this._clearBuffer();
      return;
    }
    console.log("Setting isRecording false");
    this._isRecording = false;
  }

  _clearBuffer() {
    console.log("_clearBuffer called");
    this._audioBuffer = [];
    this._audioBufferSize = 0;
  }

  cleanup() {
    console.log("cleanup called");
    this._streamSource.disconnect(this._scriptNode);
    this._bufferSource.disconnect(this._audioContext.destination);
    this._audioContext.close();
  }

  }

  // set up canvas context for visualizer
  const canvas1 = document.getElementById('canvas1');
  const canvasCtx1 = canvas1.getContext("2d");
  const canvas2 = document.getElementById('canvas2');
  const canvasCtx2 = canvas2.getContext("2d");
  var mic = new Microphone();

  function addTrack()
  {
    console.log("addTrack was clicked");
  }

  function record()
  {
    console.log("record was clicked");
    mic.startRecording();
    mic.processAudio();
  }

  function stop()
  {
    console.log("stop was clicked");
    mic.stopRecording();
    //mic.cleanup();
  }

  function play()
  {
    console.log("play was clicked");
    mic.playback();
  }

  function pause()
  {
    console.log("pause was clicked");
  }
