  // Set up Microphone class
  class Microphone {
    constructor(sampleRate = 44100, bufferLength = 4096) // sampleRate = 44100, bufferLength = 4096
    {
      console.log("constructor called");
      this._sampleRate = sampleRate; // sampleRate is the sampling rate of the microphone
      // Shorter buffer length results in a more responsive visualization but less acurate pitch detection
      this._bufferLength = bufferLength; // bufferLength is how long each buffer of audio data is for processing

      this._audioContext = new AudioContext(); // set up a new audioContext
      this._streamSource = null; // initialise the streamsource to null

      this._isRecording = false; // flag to say if a recording is recording or not

      // set up canvas context for visualizer
      this.canvas = document.getElementById('canvas');
      this.canvasCtx = this.canvas.getContext("2d");
      this.canvas.width = 800;
      this.canvas.height = 70;

      /* ****************************** Autocorrelation Initialisations start ****************************** */
      this._analyserAudioNode = this._audioContext.createAnalyser(); // create an analyser node
      this._analyserAudioNode.fftSize = 2048; // set the fftSize of the analyser to 2048

      this.rafID = null; // this is currently not used (need to fix the this/window problem)
      this.buflen = 1024; //
      this.buf = new Float32Array(this.buflen);

      this.noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]; //

      this.MIN_SAMPLES = 0; // will be initialized when AudioContext is created.
      this.GOOD_ENOUGH_CORRELATION = 0.9; // this is the "bar" for how close a correlation needs to be
      /* ****************************** Autocorrelation Initialisations end ****************************** */

      this._validateSettings(); // call _validateSettings function to check if the sample right is within an appropriate range
    };

    _validateSettings() {
      console.log("_validateSettings called");
      if (!Number.isInteger(this._sampleRate) || this._sampleRate < 22050 || this._sampleRate > 96000) { // Check if the sample rate is an integer between 22050 and 96000
        throw "Please input an integer samplerate value between 22050 to 96000"; // If it isn't throw this error
      }
      this._validateBufferLength(); // call _validateBufferLength to check if the provided buffer length is acceptable
    }

    _validateBufferLength() {
      console.log("_validateBufferLength called");
      const acceptedBufferLength = [256, 512, 1024, 2048, 4096, 8192, 16384] // list of acceptable buffer lengths
      if (!acceptedBufferLength.includes(this._bufferLength)) // checks if the given buffer length is within the acceptable range
      {
        throw "Please ensure that the buffer length is one of the following values: " + acceptedBufferLength; // throw an error if the buffer length is out of range
      }
    }

    /* *************************************** Get access to users microphone start *************************************** */
    _getUserMedia() {
      console.log("_getUserMedia called");
      // Get microphone access
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia({
          audio: true
        }).then((stream) => { // request access to the users microphone and set up a stream
          this._streamSource = this._audioContext.createMediaStreamSource(stream); // create a stream source
          console.log("_streamSource created");
          this._streamSource.connect(this._analyserAudioNode); // connect the stream source to the analyser node
          console.log("_analyserAudioNode connected to streamsource");
        }).catch((e) => {
          throw "Microphone: " + e.name + ". " + e.message; // throw errors with message
        })
        return 1;
      } else {
        throw "MediaDevices are not supported in this browser, please update your browser"; // throw error if mediaDevices is not supported
        return -1;
      }
    }
    /* *************************************** Get access to users microphone end *************************************** */


    /* *************************************** Autocorrelation algorithm start *************************************** */
    _autoCorrelate(buf, sampleRate) {
      var SIZE = buf.length; // set SIZE variable equal to buffer length 2048
      var MAX_SAMPLES = Math.floor(SIZE / 2); // set MAX_SAMPLES = 2048/2 = 1024
      var best_offset = -1; // initialise best_offset to -1
      var best_correlation = 0; // initialise best_correlation to 0
      var rms = 0; // initialise rms to 0 (rms => root-mean-square)
      var foundGoodCorrelation = false; // initialise foundGoodCorrelation flag to false
      var correlations = new Array(MAX_SAMPLES); // create an array variable called correlations of size MAX_SAMPLES (1024)

      for (var i = 0; i < SIZE; i++) {
        var val = buf[i]; // val is equal to the (i)th value in the array
        rms += val * val; // rms is the summation of each value squared
      }
      rms = Math.sqrt(rms / SIZE); // set rms equal to the square root of rms/SIZE (square root of the average)
      if (rms < 0.01) // not enough signal
        return -1;

      var lastCorrelation = 1; //
      for (var offset = this.MIN_SAMPLES; offset < MAX_SAMPLES; offset++) { // offset initialised to 0, goes through a for loop from 0 to 1024
        var correlation = 0; // re-set correlation to 0 at each offset value

        for (var i = 0; i < MAX_SAMPLES; i++) { // cycle through from 0 to 1024
          correlation += Math.abs((buf[i]) - (buf[i + offset])); // step through at each value and subtract the value at the offset from the value in the original buffer and keep adding that to the correlation value
        } // correlation will be a large enough positive float

        correlation = 1 - (correlation / MAX_SAMPLES); // set correlation to 1 - correlation/1024
        correlations[offset] = correlation; // store it, for the tweaking we need to do below.
        if ((correlation > this.GOOD_ENOUGH_CORRELATION) && (correlation > lastCorrelation)) { // if the correlation value is higher than 0.9 and the previous correlation value
          foundGoodCorrelation = true; // set foundGoodCorrelation flag to true
          if (correlation > best_correlation) {
            best_correlation = correlation; // update the best_correlation value to the latest correlation value
            best_offset = offset; // update best_offset to the latest offset value
          }
        } else if (foundGoodCorrelation) {
          // short-circuit - we found a good correlation, then a bad one, so we'd just be seeing copies from here.
          // Now we need to tweak the offset - by interpolating between the values to the left and right of the
          // best offset, and shifting it a bit.  This is complex, and HACKY in this code (happy to take PRs!) -
          // we need to do a curve fit on correlations[] around best_offset in order to better determine precise
          // (anti-aliased) offset.

          // we know best_offset >=1,
          // since foundGoodCorrelation cannot go to true until the second pass (offset=1), and
          // we can't drop into this clause until the following pass (else if).
          var shift = (correlations[best_offset + 1] - correlations[best_offset - 1]) / correlations[best_offset];
          return sampleRate / (best_offset + (8 * shift));
        }
        lastCorrelation = correlation; // set lastCorrelation to latest correlation
      }
      if (best_correlation > 0.01) {


      }
      return -1;
      //	var best_frequency = sampleRate/best_offset;
    }

    _updatePitch() {
      //console.log("updatePitchs called");
      this._analyserAudioNode.getFloatTimeDomainData(this.buf); // get the time domain information of buf which is a float32array of 1024 values... currently empty??
      console.log(this.buf);
      var ac = this._autoCorrelate(this.buf, this._audioContext.sampleRate); // call the _autoCorrelate function sending it in the buf array and the audioContext sample rate, set the return value equal to ac
      if (ac != -1) {
        console.log("Fundamental Frequency: " + ac + " Hz");
      }
    }
    /* *************************************** Autocorrelation algorithm end *************************************** */

    /* *************************************** Note rendering start *************************************** */
    _drawStave() {
      this.canvasCtx.beginPath();
      this.canvasCtx.moveTo( 5, 10 ); // start at point x=5 y=10
      this.canvasCtx.lineTo( 795, 10 ); // create line from point x=5 y=10 to x=795 y=10
      this.canvasCtx.stroke(); // draw path to canvas
      this.canvasCtx.moveTo( 5, 20 );
      this.canvasCtx.lineTo( 795, 20 );
      this.canvasCtx.stroke();
      this.canvasCtx.moveTo( 5, 30 );
      this.canvasCtx.lineTo( 795, 30 );
      this.canvasCtx.stroke();
      this.canvasCtx.moveTo( 5, 40 );
      this.canvasCtx.lineTo( 795, 40 );
      this.canvasCtx.stroke();
      this.canvasCtx.moveTo( 5, 50 );
      this.canvasCtx.lineTo( 795, 50 );
      this.canvasCtx.stroke();
      this.canvasCtx.moveTo( 795, 10 );
      this.canvasCtx.lineTo( 795, 50 );
      this.canvasCtx.stroke();
      this.canvasCtx.moveTo( 5, 10 );
      this.canvasCtx.lineTo( 5, 50 );
      this.canvasCtx.stroke();
      this.canvasCtx.moveTo( 163, 10 );
      this.canvasCtx.lineTo( 163, 50 );
      this.canvasCtx.stroke();
      this.canvasCtx.moveTo( 321, 10 );
      this.canvasCtx.lineTo( 321, 50 );
      this.canvasCtx.stroke();
      this.canvasCtx.moveTo( 479, 10 );
      this.canvasCtx.lineTo( 479, 50 );
      this.canvasCtx.stroke();
      this.canvasCtx.moveTo( 637, 10 );
      this.canvasCtx.lineTo( 637, 50 );
      this.canvasCtx.stroke();
      this.canvasCtx.moveTo( 5, 10 );
    }
    /* *************************************** Note rendering end *************************************** */

    startRecording() {
      console.log("startRecording called");
      if (!this._isRecording) this._getUserMedia();
      this._updatePitch();
      if (this._isRecording) return;
      console.log("Setting isRecording true");
      this._isRecording = true;
    }

    stopRecording() {
      console.log("stopRecording called");
      console.log("Setting isRecording false");
      this._isRecording = false;
    }

    cleanup() {
      console.log("cleanup called");
      this._audioContext.close();
    }

  }



/* *************************************** Functions connected to HTML buttons *************************************** */

  var mic = new Microphone(); // Create a mic object

  function addTrack() {
    console.log("addTrack was clicked");
    mic._drawStave()
  }

  function record() {
    console.log("record was clicked");
    mic.startRecording();
  }

  function stop() {
    console.log("stop was clicked");
    mic.stopRecording();
  }

  function play() {
    console.log("play was clicked");
  }

  function pause() {
    console.log("pause was clicked");
  }
