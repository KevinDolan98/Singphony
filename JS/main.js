/*
function init() {
  //heading.textContent = 'Singphony';
  // Older browsers might not implement mediaDevices at all, so we set an empty object first
  if (navigator.mediaDevices === undefined) {
    navigator.mediaDevices = {};
  }

  // Some browsers partially implement mediaDevices. We can't just assign an object
  // with getUserMedia as it would overwrite existing properties.
  // Here, we will just add the getUserMedia property if it's missing.
  if (navigator.mediaDevices.getUserMedia === undefined) {
    navigator.mediaDevices.getUserMedia = function(constraints) {

      // First get ahold of the legacy getUserMedia, if present
      var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

      // Some browsers just don't implement it - return a rejected promise with an error
      // to keep a consistent interface
      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
      }

      // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
      return new Promise(function(resolve, reject) {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    }
  }
}

  // set up forked web audio context, for multiple browsers
    // window. is needed otherwise Safari explodes


    //set up the different audio nodes we will use for the app
    var audioBuffer = audioCtx.createBuffer(2, 22050, 44100);

    // set up canvas context for visualizer
    var canvas1 = document.getElementById('canvas1');
    var canvasCtx1 = canvas1.getContext("2d");
    var canvas2 = document.getElementById('canvas2');
    var canvasCtx2 = canvas2.getContext("2d");
    var intendedWidth = document.querySelector('.wrapper').clientWidth;
    canvas1.setAttribute('width',intendedWidth);
    canvas2.setAttribute('width',intendedWidth);

  //main block for doing the audio recording
  if (navigator.mediaDevices.getUserMedia) {
     console.log('getUserMedia supported.');
     var constraints = {audio: true}
     navigator.mediaDevices.getUserMedia (constraints)
        .then(function(stream) {
          var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          var sampleRate = audioCtx.sampleRate;
          var audioInput = audioCtx.createMediaStreamSource(stream)
          var aud = audioInput.context;
          var bufferSize = 2048;
          var recorder = (audioCtx.createScriptProcessor || audioCtx.createJavaScriptNode).call(aud, 2048, 2, 2);
          console.log ('about to recording');
          recorder.onaudioprocess = function(stream){
            console.log ('recording');
            var left = stream.inputBuffer.getChannelData (0);
            console.log (left);
            var right = stream.inputBuffer.getChannelData (1);
            // we clone the samples
            leftchannel.push (new Float32Array (left));
            rightchannel.push (new Float32Array (right));
            recordingLength += bufferSize;
          }

             var recording = audioCtx.createMediaStreamSource(stream)
             let context = recording.contect;
             let node = (context.createScriptProcessor || context.createJavaScriptNode).call(context, bufferLen, numChannels, numChannels);
             //recording.buffer = audioBuffer;
             visualise(node);

        })
        .catch( function(err) { console.log('The following gUM error occured: ' + err);})
  } else {
     console.log('getUserMedia not supported on your browser!');
  }


  function visualise(buf){
    const leftIn = new Float32Array(4096);
    const rightIn = new Float32Array(4096);
    buf.copyFromChannel(leftIn, 0);
    buf.copyFromChannel(rightIn, 1);

    for(var i = 0; i < leftIn.length; i++)
    {
      canvasCtx1.font = "30px Arial"
      canvasCtx1.fillText(leftIn[i], 10, 50);
      console.log(leftIn[i])
      canvasCtx2.font = "30px Arial"
      canvasCtx2.fillText(rightIn[i], 10, 50);
    }
  }

*/

// set up canvas context for visualizer
var canvas1 = document.getElementById('canvas1');
var canvasCtx1 = canvas1.getContext("2d");
var canvas2 = document.getElementById('canvas2');
var canvasCtx2 = canvas2.getContext("2d");
var intendedWidth = document.querySelector('.wrapper').clientWidth;
canvas1.setAttribute('width',intendedWidth);
canvas2.setAttribute('width',intendedWidth);

function addTrack()
{
  //alert("This button will add a new melody line to the score");
  console.log("addTrack was clicked");
}

function record()
{
      var audioContext = new AudioContext();
      console.log("audio is starting up ...");
      var BUFF_SIZE_RENDERER = 4096;
      var SIZE_SHOW = 3; // number of array elements to show in console output
      var audioInput = null,
      microphone_stream = null,
      gain_node = null,
      script_processor_node = null,
      script_processor_analysis_node = null,
      analyser_node = null;

      if (!navigator.getUserMedia)
          navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia || navigator.msGetUserMedia;

      if (navigator.getUserMedia){

          navigator.getUserMedia({audio:true},
              function(stream) {
                  start_microphone(stream);
              },
              function(e) {
                  alert('Error capturing audio.');
              }
            ); // Don't know why i need this bracket

      } else { alert('getUserMedia not supported in this browser.'); }

      // ---

      function show_some_data(given_typed_array, num_row_to_display, label)
      {
          var size_buffer = given_typed_array.length;
          var index = 0;
          //console.log("__________ " + label);
          if (label === "time")
          {
              for (; index < num_row_to_display && index < size_buffer; index += 1)
              {
                  var curr_value_time = (given_typed_array[index] / 128) - 1.0;
                  //document.getElementById('time').innerHTML = "Time: " + given_typed_array[index];
                  //console.log(curr_value_time);
              }
          } else if (label === "frequency")
          {
              for (; index < num_row_to_display && index < size_buffer; index += 1)
              {
                  //document.getElementById('frequency').innerHTML = "Frequency: " + given_typed_array[index];
                  //console.log(given_typed_array[index]);
              }
          } else
          {
              throw new Error("ERROR - must pass time or frequency");
          }
      }


      function process_microphone_buffer(event)
      {
          var i, left_output_buffer, right_output_buffer;
          // not needed for basic feature set
          left_output_buffer = event.inputBuffer.getChannelData(0); //
          right_output_buffer = event.inputBuffer.getChannelData(1); //
          for(var i = 0; i < left_output_buffer.length; i = i + 1000)
          {
            document.getElementById('time').innerHTML = "Stereo PCM Data (L): " + left_output_buffer[i];
            document.getElementById('frequency').innerHTML = "Stereo PCM Data (R): " + right_output_buffer[i];
          //console.log("Stereo PCM Data (L)", left_output_buffer[i]);
          //canvasCtx1.font = "30px Arial";
          //canvasCtx1.fillText(i, 10, 50); //left_output_buffer[i]
          //console.log("Stereo PCM Data (R)", right_output_buffer[i]);
          //canvasCtx2.font = "30px Arial";
          //canvasCtx2.fillText(i, 10, 50); // right_output_buffer[i]
          }
      }

      function start_microphone(stream)
      {
          gain_node = audioContext.createGain();
          microphone_stream = audioContext.createMediaStreamSource(stream);
          microphone_stream.connect(gain_node);
          script_processor_node = audioContext.createScriptProcessor(BUFF_SIZE_RENDERER, 2, 2); //
          script_processor_node.onaudioprocess = process_microphone_buffer;
          microphone_stream.connect(script_processor_node);
          // --- setup FFT
          script_processor_analysis_node = audioContext.createScriptProcessor(4096, 2, 2); //
          script_processor_analysis_node.connect(gain_node);
          analyser_node = audioContext.createAnalyser();
          analyser_node.smoothingTimeConstant = 0;
          analyser_node.fftSize = 256;
          microphone_stream.connect(analyser_node);
          analyser_node.connect(script_processor_analysis_node);
          var buffer_length = analyser_node.frequencyBinCount;
          var array_freq_domain = new Uint8Array(buffer_length);
          var array_time_domain = new Uint8Array(buffer_length);
          //console.log("buffer_length " + buffer_length);
          script_processor_analysis_node.onaudioprocess = function()
            {
              // get the average for the first channel
              analyser_node.getByteFrequencyData(array_freq_domain);
              analyser_node.getByteTimeDomainData(array_time_domain);
              // draw the spectrogram
              if (microphone_stream.playbackState == microphone_stream.PLAYING_STATE) {
                  show_some_data(array_freq_domain, SIZE_SHOW, "frequency");
                  show_some_data(array_time_domain, SIZE_SHOW, "time"); // store this to record to aggregate buffer/file
              }
          };
      }
  //alert("This button will add a new melody line to the score");
  console.log("record was clicked");
}

function stop()
{
  //alert("This button will stop recording audio");
  console.log("stop was clicked");
  //record = false;
}

function play()
{
  //alert("This button will play the recorded melody");
  console.log("play was clicked");
}

function pause()
{
  //alert("This button will pause the recorded melody");
  console.log("pause was clicked");
}
