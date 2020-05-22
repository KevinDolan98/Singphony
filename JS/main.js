  // Global variables
  var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
  var updatePitch;
  var globalStream;

  // Set up Microphone class
  class Microphone {
    constructor(sampleRate = 44100, bufferLength = 4096) // sampleRate = 44100, bufferLength = 22500
    {
      this._sampleRate = sampleRate; // sampleRate is the sampling rate of the microphone
      this._bufferLength = bufferLength; // bufferLength is how long each buffer of audio data is for processing
      this._audioContext = new AudioContext(); // set up a new audioContext
      this._streamSource = null; // initialise the streamsource to null
      this._isRecording = false; // flag to say if a recording is recording or not
      this.numberOfCanvases = 0; // USed as a global counter of how many tracks there are in the _addCanvas, _highlightCanvas and show functions
      this.currentCanvas = 0;
      this.options = {}; // Options that set audio true and are sent to the getUserMedia function
      this.noteOffset = 10; //
      this.noteNumber = 0;
      this.windowArray = [];
      this.oscillator = this._audioContext.createOscillator();
      /* ****************************** Autocorrelation Initialisations start ****************************** */
      this._analyserAudioNode = this._audioContext.createAnalyser(); // create an analyser node
      this._analyserAudioNode.fftSize = 32768;
      this.rafID = null; // this is currently not used (need to fix the this/window problem)
      this.buflen = 4096; //
      this.buf = new Float32Array(this.buflen);
      this.noteArray = new Array();
      this.xcoordinate1 = 30;
      this.numOfStaves = 0;
      this.lineCount = 0;
      this.staveOffset = 20;
      this.Offset = 75;
      this.arrayNumber = 0;
      this.t;
      this.NOTES1 = [];
      this.NOTES2 = [];
      this.NOTES3 = [];
      this.NOTES4 = []; //[ 783.99, 0.5 ], [ 0, 0.25 ], [ 587.33, 0.25 ], [ 783.99, 0.5 ], [ 0, 0.25 ], [ 587.33, 0.25 ], [ 783.99, 0.25 ], [ 587.33, 0.25 ], [ 783.99, 0.25 ], [ 987.77, 0.25 ], [ 1174.7, 0.25] ];

      this.noteStrings = [{
          "note": "D4",
          "minfrequency": 278,
          "maxfrequency": 311.99,
          "frequency":293.66,
          "ycoordinate": 55
        },
        {
          "note": "E4",
          "minfrequency": 312,
          "maxfrequency": 340.99,
          "frequency":329.63,
          "ycoordinate": 50
        },
        {
          "note": "F4",
          "minfrequency": 341,
          "maxfrequency": 371.99,
          "frequency":349.23,
          "ycoordinate": 45
        },
        {
          "note": "G4",
          "minfrequency": 372,
          "maxfrequency": 416.99,
          "frequency":392,
          "ycoordinate": 40
        },
        {
          "note": "A4",
          "minfrequency": 417,
          "maxfrequency": 467.99,
          "frequency":440,
          "ycoordinate": 35
        },
        {
          "note": "B4",
          "minfrequency": 468,
          "maxfrequency": 509.99,
          "frequency":493.88,
          "ycoordinate": 30
        },
        {
          "note": "C5",
          "minfrequency": 510,
          "maxfrequency": 556.99,
          "frequency":523.25,
          "ycoordinate": 25
        },
        {
          "note": "D5",
          "minfrequency": 557,
          "maxfrequency": 624.99,
          "frequency":587.33,
          "ycoordinate": 20
        },
        {
          "note": "E5",
          "minfrequency": 625,
          "maxfrequency": 679.99,
          "frequency":659.25,
          "ycoordinate": 15
        },
        {
          "note": "F5",
          "minfrequency": 680,
          "maxfrequency": 742.99,
          "frequency":698.46,
          "ycoordinate": 10
        },
        {
          "note": "G5",
          "minfrequency": 743,
          "maxfrequency": 832.99,
          "frequency":783.99,
          "ycoordinate": 5
        },
      ]; //

      this.MIN_SAMPLES = 0; // will be initialized when AudioContext is created.
      this.GOOD_ENOUGH_CORRELATION = 0.9; // this is the "bar" for how close a correlation needs to be
      this._disableButton('record');
      this._disableButton('stop');
      this._disableButton('playAll');
      this.PD4 = new Audio('Sounds/D4.mp3');
      this.PE4 = new Audio('Sounds/E4.mp3');
      this.PF4 = new Audio('Sounds/F4.mp3');
      this.PG4 = new Audio('Sounds/G4.mp3');
      this.PA4 = new Audio('Sounds/A4.mp3');
      this.PB4 = new Audio('Sounds/B4.mp3');
      this.PC5 = new Audio('Sounds/C5.mp3');
      this.PD5 = new Audio('Sounds/D5.mp3');
      this.PE5 = new Audio('Sounds/E5.mp3');
      this.PF5 = new Audio('Sounds/F5.mp3');
      this.PG5 = new Audio('Sounds/G5.mp3');
      /* ****************************** Autocorrelation Initialisations end ****************************** */
      this._validateSettings(); // call _validateSettings function to check if the sample right is within an appropriate range
    };

    _validateSettings() {
      if (!Number.isInteger(this._sampleRate) || this._sampleRate < 22050 || this._sampleRate > 96000) { // Check if the sample rate is an integer between 22050 and 96000
        throw "Please input an integer samplerate value between 22050 to 96000"; // If it isn't throw this error
      }
      this._validateBufferLength(); // call _validateBufferLength to check if the provided buffer length is acceptable
    }

    _validateBufferLength() {
      const acceptedBufferLength = [256, 512, 1024, 2048, 4096, 8192, 16384, 22050] // list of acceptable buffer lengths
      if (!acceptedBufferLength.includes(this._bufferLength)) // checks if the given buffer length is within the acceptable range
      {
        throw "Please ensure that the buffer length is one of the following values: " + acceptedBufferLength; // throw an error if the buffer length is out of range
      }
    }

    /* *************************************** Get access to users microphone start *************************************** */
    _getUserMedia() {
      // Get microphone access
      if (navigator.mediaDevices || navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia(this.options).then((stream) => { // request access to the users microphone and set up a stream
          globalStream = stream;
          this._streamSource = this._audioContext.createMediaStreamSource(globalStream); // create a stream source
          this._streamSource.connect(this._analyserAudioNode); // connect the stream source to the analyser node
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
      var SIZE = buf.length; // set SIZE variable equal to buffer length 4096 => half a second
      var MAX_SAMPLES = Math.floor(SIZE / 2); // set MAX_SAMPLES = 4096/2 = 2048
      var best_offset = -1; // initialise best_offset to -1
      var best_correlation = 0; // initialise best_correlation to 0
      var rms = 0; // initialise rms to 0 (rms => root-mean-square)
      var foundGoodCorrelation = false; // initialise foundGoodCorrelation flag to false
      var correlations = new Array(MAX_SAMPLES); // create an array variable called correlations of size MAX_SAMPLES (2048)

      for (var i = 0; i < SIZE; i++) {
        var val = buf[i]; // val is equal to the (i)th value in the array
        rms += val * val; // rms is the summation of each value squared
      }
      rms = Math.sqrt(rms / SIZE); // set rms equal to the square root of rms/SIZE (square root of the average)
      if (rms < 0.01) // not enough signal
        return -1;

      var lastCorrelation = 1; // initialise lastCorrelation to 1 so that the first check won't be the best correlation
      for (var offset = 52; offset < 160; offset++) { // offset initialised to 0, goes through a for loop from 0 to 512 [for (var offset = this.MIN_SAMPLES; offset < MAX_SAMPLES; offset++)]
        var correlation = 0; // re-set correlation to 0 at each offset value

        for (var i = 0; i < MAX_SAMPLES; i++) { // cycle through from 0 to 512  MAX_SAMPLES!!!!!!!!!!
          correlation += Math.abs((buf[i]) - (buf[i + offset])); // step through at each value and subtract the value at the offset from the value in the original buffer and keep adding that to the correlation value
        } // correlation will be a large enough positive float

        correlation = 1 - (correlation / MAX_SAMPLES); // set correlation to 1 - correlation/512
        correlations[offset] = correlation; // store it, for the tweaking we need to do below.
        if ((correlation > this.GOOD_ENOUGH_CORRELATION) && (correlation > lastCorrelation)) { // if the correlation value is higher than 0.9 and the previous correlation value
          foundGoodCorrelation = true; // set foundGoodCorrelation flag to true
          if (correlation > best_correlation) { //
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
          //var shift = (correlations[best_offset + 1] - correlations[best_offset - 1]) / correlations[best_offset];
          return sampleRate / best_offset; // + (8 * shift));
        }
        lastCorrelation = correlation; // set lastCorrelation to latest correlation
      }
      if (best_correlation > 0.01) {

      }
      return -1;
      //	var best_frequency = sampleRate/best_offset;
    }

    _updatePitch() {
      this._analyserAudioNode.getFloatTimeDomainData(this.buf); // get the time domain information of buf which is a float32array of 1024 values... currently empty??
      var ac = this._autoCorrelate(this.buf, this._audioContext.sampleRate); // call the _autoCorrelate function sending it in the buf array and the audioContext sample rate, set the return value equal to ac
      console.log("Frequency: ", ac);
      if (ac >= 278 && ac <= 833) {
        console.log("LOOP ENTERED");
        this.noteArray.push(ac);
        this._drawNote(this.noteArray);
      } else if (ac == -1) {
        this._drawRest();
        if (this.currentCanvas == 1) {
          this.NOTES1.push([0, 0.5]);
        } else if (this.currentCanvas == 2) {
          this.NOTES2.push([0, 0.5]);
        } else if (this.currentCanvas == 3) {
          this.NOTES3.push([0, 0.5]);
        } else if (this.currentCanvas == 4) {
          this.NOTES4.push([0, 0.5]);
        }
      }
      if (!this._isRecording) {
        clearInterval(this.t);
      }
      /*
      if(this._isRecording)
      {
      requestAnimationFrame(() => this._updatePitch());
    }
    else {
      return;
    }
    */
    }
    /* *************************************** Autocorrelation algorithm end *************************************** */

    /* *************************************** Note rendering start *************************************** */
    _drawStave() {
      var barLength = 80;
      this.numOfStaves = 0;
      this.canvasCtx.canvas.height = 360;
      for (var x = 0; x < 5; x++) {
        for (var i = 0; i < 12; i++) {
          this.canvasCtx.beginPath();
          this._drawLine(30 + (i * barLength), 10 + (this.numOfStaves * this.staveOffset), 110 + (i * barLength), 10 + (this.numOfStaves * this.staveOffset))
          this._drawLine(30 + (i * barLength), 20 + (this.numOfStaves * this.staveOffset), 110 + (i * barLength), 20 + (this.numOfStaves * this.staveOffset))
          this._drawLine(30 + (i * barLength), 30 + (this.numOfStaves * this.staveOffset), 110 + (i * barLength), 30 + (this.numOfStaves * this.staveOffset))
          this._drawLine(30 + (i * barLength), 40 + (this.numOfStaves * this.staveOffset), 110 + (i * barLength), 40 + (this.numOfStaves * this.staveOffset))
          this._drawLine(30 + (i * barLength), 50 + (this.numOfStaves * this.staveOffset), 110 + (i * barLength), 50 + (this.numOfStaves * this.staveOffset))
          this._drawLine(110 + (i * barLength), 10 + (this.numOfStaves * this.staveOffset), 110 + (i * barLength), 50 + (this.numOfStaves * this.staveOffset))
          this._drawLine(30 + (i * barLength), 10 + (this.numOfStaves * this.staveOffset), 30 + (i * barLength), 50 + (this.numOfStaves * this.staveOffset))
        }
        this.numberOfTracks++;
        this.numOfStaves++;
      }
    }

    _drawLine(x1, y1, x2, y2) {
      this.canvasCtx.moveTo(x1, y1 + (this.numberOfTracks * this.canvasOffset)); // start at point x=5 y=10
      this.canvasCtx.lineTo(x2, y2 + (this.numberOfTracks * this.canvasOffset)); // create line from point x=5 y=10 to x=795 y=10
      this.canvasCtx.stroke(); // draw path to canvas
    }

    _drawNote(array) {
      console.log("Draw Note called!!!");
      for (var x = 0; x < this.noteStrings.length; x++) {
        if (array[this.arrayNumber] >= this.noteStrings[x]["minfrequency"] && array[this.arrayNumber] <= this.noteStrings[x]["maxfrequency"]) // E5
        {
          console.log("Draw Note LOOP Entered!!!");
          this.canvasCtx.fillStyle = 'black';
          this.canvasCtx.beginPath();
          this.canvasCtx.arc(35 + (this.noteOffset * this.noteNumber), (this.noteStrings[x].ycoordinate) + (this.lineCount * this.Offset), 5, 0, 360, false);
          this.canvasCtx.fill();
          this.xcoordinate1 = 35 + (this.noteOffset * this.noteNumber);
          this.noteNumber++;
          this.arrayNumber++;
          console.log("X: ", this.xcoordinate1);
          if (this.currentCanvas == 1) {
            this.NOTES1.push([this.noteStrings[x].frequency, 0.5]);
          } else if (this.currentCanvas == 2) {
            this.NOTES2.push([this.noteStrings[x].frequency, 0.5]);
          } else if (this.currentCanvas == 3) {
            this.NOTES3.push([this.noteStrings[x].frequency, 0.5]);
          } else if (this.currentCanvas == 4) {
            this.NOTES4.push([this.noteStrings[x].frequency, 0.5]);
          }
          //console.log("Line number: ", this.lineCount);
          //console.log("xcoordinate1: ", this.xcoordinate1);
          if (this.xcoordinate1 == 985) {
            this.lineCount++;
            this.noteNumber = 0;
            if (this.lineCount == 5) {
              alert("Time Limit Reached");
              this.stopRecording();
              this._enableButton("play");
              this._enableButton("addTrack");
              this._disableButton("record");
              this._disableButton("stop");
              globalStream.getAudioTracks()[0].stop();
            }
          }
        }
      }
    }

    _drawRest() {
      var x1 = 35 + (this.noteOffset * this.noteNumber);
      var x2 = 40 + (this.noteOffset * this.noteNumber);
      var y = 25 + (this.lineCount * this.Offset)
      this.canvasCtx.moveTo(x1, y);
      this.canvasCtx.lineTo(x2, y);
      this.canvasCtx.stroke();
      this.canvasCtx.moveTo(x1, y);
      this.noteNumber++;
      if (x1 == 985) {
        this.lineCount++;
        this.noteNumber = 0;
        if (this.lineCount == 5) {
          alert("Time Limit Reached");
          this.stopRecording();
          this._enableButton("play");
          this._enableButton("addTrack");
          this._disableButton("record");
          this._disableButton("stop");
          globalStream.getAudioTracks()[0].stop();
        }
      }
    }

    /* *************************************** Note rendering end *************************************** */

    /* *************************************** Disable and enable canvas start *************************************** */

    _addCanvas() {
      if (this.numberOfCanvases == 1) {
        // set up canvas context for visualizer
        this.canvasContainer = document.getElementById('canvasContainer1');
        this.canvas = document.getElementById('canvas1');
        this.canvasCtx = this.canvas.getContext("2d");
        this.canvasOffset = 55;
        this.numberOfTracks = 0;
        this.canvas.classList.remove("canvas3");
        this.canvas.classList.add("canvas1");
        this.canvasContainer.classList.remove("canvas-container3");
        this.canvasContainer.classList.add("canvas-container1");
      } else if (this.numberOfCanvases == 2) {
        // set up canvas context for visualizer
        this._greyCanvas();
        this.canvasContainer = document.getElementById('canvasContainer2');
        this.canvas = document.getElementById('canvas2');
        this.canvasCtx = this.canvas.getContext("2d");
        this.canvasOffset = 55;
        this.numberOfTracks = 0;
        this.canvas.classList.remove("canvas3");
        this.canvas.classList.add("canvas1");
        this.canvasContainer.classList.remove("canvas-container3");
        this.canvasContainer.classList.add("canvas-container1");
      } else if (this.numberOfCanvases == 3) {
        // set up canvas context for visualizer
        this._greyCanvas();
        this.canvasContainer = document.getElementById('canvasContainer3');
        this.canvas = document.getElementById('canvas3');
        this.canvasCtx = this.canvas.getContext("2d");
        this.canvasOffset = 55;
        this.numberOfTracks = 0;
        this.canvas.classList.remove("canvas3");
        this.canvas.classList.add("canvas1");
        this.canvasContainer.classList.remove("canvas-container3");
        this.canvasContainer.classList.add("canvas-container1");
      } else if (this.numberOfCanvases == 4) {
        // set up canvas context for visualizer
        this._greyCanvas();
        this.canvasContainer = document.getElementById('canvasContainer4');
        this.canvas = document.getElementById('canvas4');
        this.canvasCtx = this.canvas.getContext("2d");
        this.canvasOffset = 55;
        this.numberOfTracks = 0;
        this.canvas.classList.remove("canvas3");
        this.canvas.classList.add("canvas1");
        this.canvasContainer.classList.remove("canvas-container3");
        this.canvasContainer.classList.add("canvas-container1");
      }
    }

    _clearCanvas(canvasNumber) {
      if (canvasNumber == 1) {
        this.canvas = document.getElementById('canvas1');
        this.canvasCtx = this.canvas.getContext("2d");
        this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.NOTES1 = [];
      } else if (canvasNumber == 2) {
        this.canvas = document.getElementById('canvas2');
        this.canvasCtx = this.canvas.getContext("2d");
        this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.NOTES2 = [];
      } else if (canvasNumber == 3) {
        this.canvas = document.getElementById('canvas3');
        this.canvasCtx = this.canvas.getContext("2d");
        this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.NOTES3 = [];
      } else if (canvasNumber == 4) {
        this.canvas = document.getElementById('canvas4');
        this.canvasCtx = this.canvas.getContext("2d");
        this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.NOTES4 = [];
      }
    }

    _greyCanvas() {
      this.canvasContainer.classList.remove("canvas-container1");
      this.canvasContainer.classList.add("canvas-container2");
    }

    _highlightCanvas() {
      if (this.numberOfCanvases == 1) {
        // set up canvas context for visualizer
        this.canvasContainer = document.getElementById('canvasContainer1');
        this.canvasContainer.classList.remove("canvas-container2");
        this.canvasContainer.classList.add("canvas-container1");
      } else if (this.numberOfCanvases == 2) {
        // set up canvas context for visualizer
        this.canvasContainer = document.getElementById('canvasContainer2');
        this.canvasContainer.classList.remove("canvas-container2");
        this.canvasContainer.classList.add("canvas-container1");
      } else if (this.numberOfCanvases == 3) {
        // set up canvas context for visualizer
        this.canvasContainer = document.getElementById('canvasContainer3');
        this.canvasContainer.classList.remove("canvas-container2");
        this.canvasContainer.classList.add("canvas-container1");
      } else if (this.numberOfCanvases == 4) {
        // set up canvas context for visualizer
        this.canvasContainer = document.getElementById('canvasContainer4');
        this.canvasContainer.classList.remove("canvas-container2");
        this.canvasContainer.classList.add("canvas-container1");
      }
    }

    /* *************************************** Disable and enable canvas end *************************************** */

    /* *************************************** Disable and enable button start *************************************** */
    _disableButton(id) {
      var button = document.getElementById(id);
      button.disabled = true;
      button.classList.remove("button", "button2", "button3");
      button.classList.add("button1");
    }

    _enableButton(id) {
      var button = document.getElementById(id);
      button.disabled = false;
      button.classList.remove("button1", "button2", "button3");
      button.classList.add("button");
    }

    _redButton(id) {
      var button = document.getElementById(id);
      button.disabled = true;
      button.classList.remove("button", "button1");
      button.classList.add("button2");
    }
    /* *************************************** Disable and enable button end *************************************** */

    /* *************************************** Music playing start *************************************** */

    _playNotes(context, notes, instrument, filter, ) {
      notes.reduce((offset, [frequency, duration]) => {
        this.oscillatorNode = this._audioContext.createOscillator();
        //console.log("Offset: ", offset);
        //console.log("Frequency: ", frequency);
        //console.log("Duration: ", duration);
        this.filterNode = this._audioContext.createBiquadFilter();
        this.filterNode.type = filter;
        this.filterNode.frequency.value = 300;
        this.filterNode.Q.value = 0.1;
        this.oscillatorNode.frequency.value = frequency;
        this.oscillatorNode.type = instrument;
        this.oscillatorNode.connect(this.filterNode);
        this.filterNode.connect(this._audioContext.destination);
        this.oscillatorNode.start(offset);
        this.oscillatorNode.stop((offset + duration));
        return offset + duration;
      }, this._audioContext.currentTime);
    }

    /* *************************************** Music playing end *************************************** */

    startRecording() {
      //console.log("startRecording called");
      this.options = {
        audio: true,
        video: false
      };
      if (!this._isRecording) {
        this._getUserMedia();
      }
      this._isRecording = true;
      this.t = setInterval(this._updatePitch.bind(this), 450);
      if (this._isRecording) return;
  }

  stopRecording() {
    this._isRecording = false;
  }

  cleanup() {
    //console.log("cleanup called");
    this._audioContext.close();
  }

  }



  /* *************************************** Functions connected to HTML buttons *************************************** */

  var mic = new Microphone(); // Create a mic object

  function addTrack() {
    //console.log("addTrack was clicked");
    if (mic.numberOfCanvases < 4) {
      mic.numberOfCanvases++
      mic.currentCanvas++;
      mic._addCanvas();
      mic._drawStave();
      mic._enableButton("record");
      mic._disableButton("addTrack");
      mic._disableButton("playAll");
      mic.noteNumber = 0;
      mic.noteArray = [];
      mic.numOfStaves = 0;
      mic.lineCount = 0;
      if (mic.currentCanvas == 1) {
        mic._disableButton("instruments1");
        mic._disableButton("save1");
        mic._disableButton("play1");
        mic._disableButton('clear1');
        mic._disableButton('saveTypes1');
        mic._disableButton('filter1');
      }
      if (mic.currentCanvas == 2) {
        mic._disableButton("instruments2");
        mic._disableButton("save2");
        mic._disableButton("play2");
        mic._disableButton('clear2');
        mic._disableButton('saveTypes2');
        mic._disableButton('filter2');
      }
      if (mic.currentCanvas == 3) {
        mic._disableButton("instruments3");
        mic._disableButton("save3");
        mic._disableButton("play3");
        mic._disableButton('clear3');
        mic._disableButton('saveTypes3');
        mic._disableButton('filter3');
      }
      if (mic.currentCanvas == 4) {
        mic._disableButton("instruments4");
        mic._disableButton("save4");
        mic._disableButton("play4");
        mic._disableButton('clear4');
        mic._disableButton('saveTypes4');
        mic._disableButton('filter4');
      }
    } else {
      alert("Can't add more than 4 parallel tracks!")
    }
  }

  function record() {
    //console.log("record was clicked");
    //mic.numOfStaves = 0;
    //mic.lineCount = 0;
    mic.arrayNumber = 0;
    mic._enableButton("stop");
    mic._disableButton("addTrack");
    mic._redButton("record");
    mic.startRecording();
  }

  function stop() {
    //console.log("stop was clicked");
    mic.stopRecording();
    mic._enableButton("playAll");
    mic._enableButton("addTrack");
    mic._disableButton("record");
    mic._disableButton("stop");
    mic._enableButton("record");
    globalStream.getAudioTracks()[0].stop();
    if (mic.currentCanvas == 1) {
      mic._enableButton("instruments1");
      mic._enableButton("save1");
      mic._enableButton("play1");
      mic._enableButton('clear1');
      mic._enableButton('saveTypes1');
      mic._enableButton('filter1');
    }
    if (mic.currentCanvas == 2) {
      mic._enableButton("instruments2");
      mic._enableButton("save2");
      mic._enableButton("play2");
      mic._enableButton('clear2');
      mic._enableButton('saveTypes2');
      mic._enableButton('filter2');
    }
    if (mic.currentCanvas == 3) {
      mic._enableButton("instruments3");
      mic._enableButton("save3");
      mic._enableButton("play3");
      mic._enableButton('clear3');
      mic._enableButton('saveTypes3');
      mic._enableButton('filter3');
    }
    if (mic.currentCanvas == 4) {
      mic._enableButton("instruments4");
      mic._enableButton("save4");
      mic._enableButton("play4");
      mic._enableButton('clear4');
      mic._enableButton('saveTypes4');
      mic._enableButton('filter4');
    }
  }

  function play() {
    const audioContext = mic.audioContext;
    if (mic.currentCanvas == 1) {
      var e = document.getElementById("instruments1");
      var strUser = e.options[e.selectedIndex].value;
      var d = document.getElementById("filter1");
      var filter = d.options[d.selectedIndex].value;
      mic._playNotes(audioContext, mic.NOTES1, strUser, filter);
    } else if (mic.currentCanvas == 2) {
      var e = document.getElementById("instruments2");
      var strUser = e.options[e.selectedIndex].value;
      var d = document.getElementById("filter2");
      var filter = d.options[d.selectedIndex].value;
      mic._playNotes(audioContext, mic.NOTES2, strUser, filter);
    } else if (mic.currentCanvas == 3) {
      var e = document.getElementById("instruments3");
      var strUser = e.options[e.selectedIndex].value;
      var d = document.getElementById("filter3");
      var filter = d.options[d.selectedIndex].value;
      mic._playNotes(audioContext, mic.NOTES3, strUser, filter);
    } else if (mic.currentCanvas == 4) {
      var e = document.getElementById("instruments4");
      var strUser = e.options[e.selectedIndex].value;
      var d = document.getElementById("filter4");
      var filter = d.options[d.selectedIndex].value;
      mic._playNotes(audioContext, mic.NOTES4, strUser, filter);
    }
  }

  function save() {
    if (mic.currentCanvas == 1) {
      var e = document.getElementById("saveTypes1");
      var type = e.options[e.selectedIndex].value;
      if (type == "CSV") {
        let csvContent = "data:text/csv;charset=utf-8," +
          mic.NOTES1.map(e => e.join(",")).join("\n");
        var encodedUri = encodeURI(csvContent);
      } else if (type == "PNG") {
        var canvas = document.getElementById("canvas1");
        canvasCtx = canvas.getContext("2d");
        var image = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream"); // here is the most important part because if you dont replace you will get a DOM 18 exception.
        window.location.href = image; // it will save locally
      }
    } else if (mic.currentCanvas == 2) {
      var e = document.getElementById("saveTypes2");
      var type = e.options[e.selectedIndex].value;
      if (type == "CSV") {
        let csvContent = "data:text/csv;charset=utf-8," +
          mic.NOTES2.map(e => e.join(",")).join("\n");
        var encodedUri = encodeURI(csvContent);
      } else if (type == "PNG") {
        var canvas = document.getElementById("canvas2");
        canvasCtx = canvas.getContext("2d");
        var image = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream"); // here is the most important part because if you dont replace you will get a DOM 18 exception.
        window.location.href = image; // it will save locally
      }
    } else if (mic.currentCanvas == 3) {
      var e = document.getElementById("saveTypes3");
      var type = e.options[e.selectedIndex].value;
      if (type == "CSV") {
        let csvContent = "data:text/csv;charset=utf-8," +
          mic.NOTES3.map(e => e.join(",")).join("\n");
        var encodedUri = encodeURI(csvContent);
      } else if (type == "PNG") {
        var canvas = document.getElementById("canvas3");
        canvasCtx = canvas.getContext("2d");
        var image = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream"); // here is the most important part because if you dont replace you will get a DOM 18 exception.
        window.location.href = image; // it will save locally
      }
    } else if (mic.currentCanvas == 4) {
      var e = document.getElementById("saveTypes4");
      var type = e.options[e.selectedIndex].value;
      if (type == "CSV") {
        let csvContent = "data:text/csv;charset=utf-8," +
          mic.NOTES4.map(e => e.join(",")).join("\n");
        var encodedUri = encodeURI(csvContent);
      } else if (type == "PNG") {
        var canvas = document.getElementById("canvas4");
        canvasCtx = canvas.getContext("2d");
        var image = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream"); // here is the most important part because if you dont replace you will get a DOM 18 exception.
        window.location.href = image; // it will save locally
      }
    }
    window.open(encodedUri);
  }

  function show(num) {
    console.log("show was clicked");
    //console.log(num);
    if (mic.currentCanvas == 1) {
      mic.canvasContainer = document.getElementById('canvasContainer1');
      mic._greyCanvas();
    } else if (mic.currentCanvas == 2) {
      mic.canvasContainer = document.getElementById('canvasContainer2');
      mic._greyCanvas();
    } else if (mic.currentCanvas == 3) {
      mic.canvasContainer = document.getElementById('canvasContainer3');
      mic._greyCanvas();
    } else if (mic.currentCanvas == 4) {
      mic.canvasContainer = document.getElementById('canvasContainer4');
      mic._greyCanvas();
    }
    if (num == 1) {
      mic.numberOfCanvases = 1;
      mic._highlightCanvas();
      mic.currentCanvas = 1;
    } else if (num == 2) {
      mic.numberOfCanvases = 2;
      mic._highlightCanvas();
      mic.currentCanvas = 2;
    } else if (num == 3) {
      mic.numberOfCanvases = 3;
      mic._highlightCanvas();
      mic.currentCanvas = 3;
    } else if (num == 4) {
      mic.numberOfCanvases = 4;
      mic._highlightCanvas();
      mic.currentCanvas = 4;
    }
  }

  function playAll() {
    console.log("playAll Called");
    //mic._disableButton("play");
    const audioContext = mic.audioContext;
    var e1 = document.getElementById("instruments1");
    var strUser1 = e1.options[e1.selectedIndex].value;
    mic._playNotes(audioContext, mic.NOTES1, strUser1);

    var e2 = document.getElementById("instruments2");
    var strUser2 = e2.options[e2.selectedIndex].value;
    mic._playNotes(audioContext, mic.NOTES2, strUser2);

    var e3 = document.getElementById("instruments3");
    var strUser3 = e3.options[e3.selectedIndex].value;
    mic._playNotes(audioContext, mic.NOTES3, strUser3);

    var e4 = document.getElementById("instruments4");
    var strUser4 = e4.options[e4.selectedIndex].value;
    mic._playNotes(audioContext, mic.NOTES4, strUser4);
  }

  function clearBars() {
    console.log("Clear Called");
    mic.noteNumber = 0;
    mic.noteArray = [];
    mic.numOfStaves = 0;
    mic.lineCount = 0;
    if (mic.currentCanvas == 1) {
      mic._clearCanvas(1);
      mic.numberOfCanvases = 1;
      mic.currentCanvas = 1;
      mic._addCanvas();
      mic._drawStave();
    } else if (mic.currentCanvas == 2) {
      mic._clearCanvas(2);
      mic.numberOfCanvases = 2;
      mic.currentCanvas = 2;
      mic._addCanvas();
      mic._drawStave();
    } else if (mic.currentCanvas == 3) {
      mic._clearCanvas(3);
      mic.numberOfCanvases = 3;
      mic.currentCanvas = 3;
      mic._addCanvas();
      mic._drawStave();
    } else if (mic.currentCanvas == 4) {
      mic._clearCanvas(4);
      mic.numberOfCanvases = 4;
      mic.currentCanvas = 4;
      mic._addCanvas();
      mic._drawStave();
    }
  }

  function playMP3()
  {
    /*
    var audio = new Audio();
    audio.src = 'audio files/A4.mp3';
    audio.controls = true;
    audio.autoplay = true;
    document.body.appendChild(audio);

    var context = new AudioContext();
    var analyser = context.createAnalyser();

    window.addEventListener('load', function(e) {
    // Our <audio> element will be the audio source.
    var source = context.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(context.destination);
    }, false);
      */
    //var audio = new Audio('https://interactive-examples.mdn.mozilla.net/media/examples/t-rex-roar.mp3');
      mic.PA4.play();
      mic.PC5.play();
      mic.PE5.play();
  }
