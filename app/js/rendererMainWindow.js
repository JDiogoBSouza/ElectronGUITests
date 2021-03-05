const {ipcRenderer} = require('electron');
const fs = require('fs')

// UDP Server imports
const dgram = require('dgram');
// Performance UDP Solution
const Dequeue = require('dequeue');
const FIFO = new Dequeue();

// Configuration file path
const pelvConfig_path = './pelv.conf'

// Mode buttons
const btnRealTime = document.getElementById("btn_realTime");
const btnFtp = document.getElementById("btn_ftp");

// Actual mode
var pelvwareMode = 0;           // 0 - Realtime, 1 - FTP

btnRealTime.onclick = function()
{
    // TODO: Limpar o gráfico atual para a plotagem do gráfico do Realtime.

    if( pelvwareMode != 0 ){

        pelvwareMode = 0;

        btnFtp.classList.remove("active");
        btnFtp.disabled = false;
        btnRealTime.classList.add("active");
        btnRealTime.disabled = true;
    
        // Active RealTime controller buttons
        btnPlay.classList.remove("active");
        btnPlay.disabled = false;
    
        // Deactive FTP Open file button
        btnOpenFile.classList.add("active");
        btnOpenFile.disabled = true;
    }
    
};

btnFtp.onclick = function()
{
    // TODO: Verificar se deseja salvar os dados do gráfico ao mudar do modo realtime para FTP.
    
    // TODO: Limpar o gráfico atual para a plotagem do gráfico do FTP.
    if( pelvwareMode != 1 ){

        pelvwareMode = 1;

        btnRealTime.classList.remove("active");
        btnRealTime.disabled = false;
        btnFtp.classList.add("active");
        btnFtp.disabled = true;
    
        // Deactive RealTime controller buttons
        btnPlay.classList.add("active");
        btnPlay.disabled = true;
    
        // Active FTP Open file button
        btnOpenFile.classList.remove("active");
        btnOpenFile.disabled = false;
    }
    
};

// System buttons
const btnClose = document.getElementById("btn_close");
const btnMaximize = document.getElementById("btn_maximize");
const btnConfigure = document.getElementById("btn_configure");

// FTP buttons
const btnOpenFile = document.getElementById("btn_openFile");

// Realtime buttons
const btnPlay = document.getElementById("btn_play");
const btnPause = document.getElementById("btn_pause");
const btnStop = document.getElementById("btn_stop");
const btnSave = document.getElementById("btn_save");
const btnAddData = document.getElementById("btn_addData");

btnClose.onclick = function()
{
    ipcRenderer.send('close-me');
};

btnMaximize.onclick = function()
{
    ipcRenderer.send('maximize-me');
};

// Check if configuration file exists and read
try{

    if( fs.existsSync(pelvConfig_path) ){

        // If file exists, store to send messages.
        const pelvwareIP = fs.readFileSync(pelvConfig_path, 'utf8')
        console.log("IP da Pelvware: " + pelvwareIP);

    }
    else{
        
        // Open dialog here ?
        console.log("Arquivo de configuração inexistente, primeira utilização !");

    }
}
catch(e){

    console.log("Erro ao procurar arquivo de configuração: " + e);

}

// Create Anychart graph

var chartData = [];
var chart = null;
var dataSet = null;

anychart.onDocumentReady(function() 
{
    // create a data set
    dataSet = anychart.data.set(chartData);
    
    // map the data
    var mapping = dataSet.mapAs({x: "time", value: "value"});

    // create a chart
    chart = anychart.line();

    // create a series and set the data
    var series = chart.line(mapping);

    // set the container id and x scale
    chart.container("chart-container");
    chart.xScale().mode('continuous');

    // autoHide the scroller
    chart.xScroller().autoHide(true);
    chart.xScroller(true);

    // prevent the scrolling while the button is not released yet
    //chart.xZoom().continuous(false);
    
    // change the scroller orientation
    //chart.xScroller().position("beforeAxes");

    // adjusting the thumbs behavior and look
    //chart.xScroller().thumbs().autoHide(true);
    //chart.xScroller().thumbs().hoverFill("#FFD700");

    // set chart title
    chart.title("Pelvware Data");

    // initiate drawing the chart
    chart.draw();
    
    chart.xAxis().title("Tempo (ms)");
    chart.yAxis().title("Valor (mv)");

    // TODO: Set auto ajust in Y axis.
    chart.yScale().minimum(0);
    chart.yScale().maximum(2);

    // add a listener
    chart.xScroller().listen("scrollerchangefinish", function(e){

        var startRatio = e.startRatio;
        var endRatio = e.endRatio;
        // change the chart title
        chart.title("Exibindo de " + (startRatio*100).toFixed(0) + "% até " + (endRatio*100).toFixed(0) + "% do gráfico");

    });
});

var contador = 0;

btnConfigure.addEventListener('click', function(e) {

    ipcRenderer.send('openConfigOnMain');
    
    /*
    // Adicionar dado ao gráfico
    const valor = Math.floor(Math.random() * 21);

    dataSet.append({"time": contador, "value": valor});
    contador++;*/
});

// Receive data from udp here
var server = dgram.createSocket('udp4');

// Starts manually udp server.
btnPlay.addEventListener('click', function(e) {

    console.log("Iniciando Recepção...");

    // Disable Play and Save buttons
    btnPlay.classList.add("active");
    btnPlay.disabled = true;
    btnSave.classList.add("active");
    btnSave.disabled = true;

    // Enable Pause and Stop buttons
    btnPause.classList.remove("active");
    btnPause.disabled = false;
    btnStop.classList.remove("active");
    btnStop.disabled = false;

    // Start UDP Server and ?? Send Command to Request Data to ESP ??
    try{
        server.bind(5000, () => {
            // Do Something after bind ?
        });
    }
    catch(err){
        console.log("Bind Error: " + err.message);
    }
});

server.on('error', (err) => {
    console.log(`server error:\n${err.stack}`);
    server.close();
});

server.on('message', (msg, rinfo) => {
    //console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);

    // Separe value and timestamp.
    let data = (msg+'').split(';');

    // TODO: Check if data is complete
    if( data.length == 2){

        //console.log("Dado Original: " + msg)
        //console.log(`Timestamp: ${data[0]} Data: ${data[1]}`);
        
        // Put data in a FIFO
        FIFO.push(data);
    }
    else{
        console.log("Dado imcompleto: " + msg)
    }

});

server.on('listening', () => {
    const address = server.address();
    console.log(`server listening ${address.address}:${address.port}`);
});

// TODO: It's not working for now. Make changes.
btnStop.addEventListener('click', function(e) {
    
    // Enable Play and Save buttons
    btnPlay.classList.remove("active");
    btnPlay.disabled = false;
    btnSave.classList.remove("active");
    btnSave.disabled = false;

    // Disable Pause and Stop buttons
    btnPause.classList.add("active");
    btnPause.disabled = true;
    btnStop.classList.add("active");
    btnStop.disabled = true;

    // Stop UDP Server and ?? Send Command to ESP Stop ??
    server.close( () => {
        // Do Something afet close ?
    });
});

// Start UDP Server
fetcher();

let start1 = 0;

function fetcher() {

    if (FIFO.length > 0){
        var dataFIFO = FIFO.shift();

        // Put graph here.
        dataSet.append({"time": dataFIFO[0], "value": dataFIFO[1]});
    }

    setImmediate(fetcher); //make this function continuously run
}

