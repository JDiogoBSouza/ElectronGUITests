const {ipcRenderer} = require('electron');
const serialPort = require('serialport');
const readline = require('@serialport/parser-readline');
const {EventEmitter} = require('events');
const ip = require('ip');

class Evento extends EventEmitter{}
const meuEvento = new Evento()

const counterTimes   = 20;  // Default: 10 Times
const checkTime      = 1;   // Default: 1 Second
const pelvwareBaudRate = 115200; // Default Wemos Baud Rate
var configStatus = 0;
var pelvwarePort = null;
var pelvwareIP = null;
var ssidSelecionado = null;

var tbuscaPorta = null;

var firstCheck = true;
var counter = counterTimes;
var firstCheckValue = null;

/*const port = new SerialPort('/dev/tty-usbserial1', {
    baudRate: 57600
  })*/

// System buttons
const btnClose = document.getElementById("btn_close");

// ConfigGUI Components
const btnRefreshCOMS = document.getElementById("btn_refreshCOMS");
const btnPorts = document.getElementById("btn_ports");
const btnConnect = document.getElementById("btn_connect");
const btnAutoConnect = document.getElementById("btn_autoConnect");
const buttonAutoConnectInner = '<span class="icon icon-plus icon-text" id></span>Auto-Connect';
const loadingCircle = document.getElementById("loadingCircle");
const wifiList = document.getElementById("wifiList");
const title = document.getElementById("title");
const divButtons = document.getElementById("div_buttons");
const finishLabel = document.getElementById("finishConfig");

function disableAllButtons()
{
    btnConnect.classList.add("active");
    btnConnect.disabled = true;
    btnAutoConnect.classList.add("active");
    btnAutoConnect.disabled = true;
    btnRefreshCOMS.classList.add("active");
    btnRefreshCOMS.disabled = true;
    btnPorts.classList.add("active");
    btnPorts.disabled = true;
}

var boxPesquisa = document.createElement("boxPesquisa");
boxPesquisa.type = "text";
boxPesquisa.className = "form-control";
boxPesquisa.placeholder = "Pesquisar";

// Receive password from main.
ipcRenderer.on('mainPasswordToConfig', (event, arg) => {
    
    if(arg){
        
        let msg = ssidSelecionado + ';' + arg + ';' + getMyIp();
        
        console.log("Enviando: " + msg);
        pelvwarePort.write(msg);

    }
    
    btnAutoConnect.classList.add("active");
    btnAutoConnect.disabled = true;
    wifiList.style.display = "none";
    title.style.display = "none";
    divButtons.style.display = "none";
    loadingCircle.style.display = "block";

});

function getMyIp()
{
    return ip.address(); 
}

btnRefreshCOMS.onclick = function(event){
}

btnConnect.onclick = function(event){
    
    if(ssidSelecionado){
        ipcRenderer.send('openPasswordOnConfig');
    }

}

wifiList.onclick = function(event){

    if (event.target.tagName != "LI") return;
    
    singleSelect(event.target);
}

// prevent unneeded selection of list elements on clicks
wifiList.onmousedown = function(){

    return false;

};

function singleSelect(li){

    let selected = wifiList.querySelectorAll('.selected');

    for(let elem of selected){
        elem.classList.remove('selected');
    }
    
    li.classList.add('selected');

    // Valor do SSID: li.innerHTML;
    ssidSelecionado = li.innerHTML;
}

btnClose.onclick = function()
{
    ipcRenderer.send('close-me');
    //ipcRenderer.send('closeConfigStartMain');
};

btnAutoConnect.onclick = function()
{    
    let startConfig = true;

    if( configStatus > 0 ){

        if( confirm("Tem certeza que deseja reiniciar a configuração da Pelvware?") ){
            // Reiniciar configuração
            alert("Remova a USB da Pelvware, feche este alerta e insira novamente.");
            startConfig = true;
            configStatus = 0;
        }
        else{
            startConfig = false;
        }
    }

    if( startConfig ){
        firstCheck = true;
        counter = counterTimes;
        firstCheckValue = null;
        btnAutoConnect.innerHTML = buttonAutoConnectInner + " " + counterTimes + "s";
        
        ssidSelecionado = null;
        btnAutoConnect.classList.add("active");
        btnAutoConnect.disabled = true;
        wifiList.style.display = "none";
        title.style.display = "none";
        divButtons.style.display = "none";
        limparLista();

        tbuscaPorta = setInterval(verificarPortas, checkTime * 1000);
    }

};

function adicionaLinhaLista(ssid, selected)
{
    let node = document.createElement("LI");                 // Create a <li> node
    let textnode = document.createTextNode(ssid);            // Create a text node
    node.appendChild(textnode);                              // Append the text to <li>

    if( selected )
        node.classList.add('selected');                          // Set a node selected.

    wifiList.appendChild(node);                              // Append <li> to <ul> with id="myList"
}

function limparLista(){

    wifiList.innerHTML = "";
    wifiList.appendChild(boxPesquisa); // put it into the DOM
}

async function verificarPortas(){
    
    let portsFound = await getPorts();

    //console.log(`Quantidade de portas encontradas: ${portsFound.length}`)

    if( firstCheck ){
        firstCheckValue = portsFound.length;
        firstCheck = false;
    }

    // Properties of Serialport: path, manufacturer, serialNumber, pnpId, locationId, productId, vendorId

    const pelvwareManufacturer  = "Silicon Labs";
    const pelvwareProductId     = "EA60";
    const pelvwareSerialNumber  = "0001";
    const pelvwareVendorId      = "10C4"

    if( portsFound.length > firstCheckValue ){

        portsFound.forEach( ( port ) =>{

            if( port.manufacturer == pelvwareManufacturer && port.productId == pelvwareProductId && port.serialNumber == pelvwareSerialNumber && port.vendorId == pelvwareVendorId){

                // Publisher - emissor
                meuEvento.emit('interromperBusca', true, port.path);
                console.log(port);

            }

        } );
        
    }
    else
    {
        counter--;

        btnAutoConnect.innerHTML = buttonAutoConnectInner + " " + counter + "s";

        if( counter == 0 ){

            // Publisher - emissor
            meuEvento.emit('interromperBusca');
        }
    }

}

// Subscriber - assinante
meuEvento.on('interromperBusca', (found, path) =>{
    
    //console.log("Ativou o Evento !")
            
    btnAutoConnect.innerHTML = buttonAutoConnectInner;
    btnAutoConnect.classList.remove("active");
    btnAutoConnect.disabled = false;

    if( found ){

        //alert(`Pelvware Encontrada, Iniciando Configuração da Porta: ${path}`)

        pelvwarePort = new serialPort(path, { baudRate: pelvwareBaudRate });

        const parser = pelvwarePort.pipe(new readline({ delimiter: '\r\n' }))
        
        // The open event is always emitted
        pelvwarePort.on('open', function() 
        {
            //console.log("A porta foi aberta !");

            pelvwarePort.flush();
        
            parser.on('ready', () => {

                //console.log('Novo Dado Recebido !');

            });

            parser.on('data', (data) => {

                switch(data)
                {
                    case "StartConfiguration":

                        loadingCircle.style.display = "block";
                        
                        configStatus = 1;
                        pelvwarePort.write('ConfigurationStarted')

                        setTimeout( () => {

                            pelvwarePort.write('SerialSync');

                        }, 1000);
                        

                    break;

                    case "SyncOK":

                        configStatus = 2;
                        
                        setTimeout( () => {

                            pelvwarePort.write('GetWifiList');

                        }, 1000);

                    break;

                    case "ConnectionError":

                        alert("Falha na conexão, verifique se a senha está correta!");
                        pelvwarePort.write('GetWifiList')

                    break;

                    case "SSIDFormatError":

                        alert("Falha na conexão, verifique se a senha está correta!");
                        pelvwarePort.write('GetWifiList')

                    break;

                    case "SSIDOrPasswordError":

                        alert("Falha na conexão, verifique se a senha está correta!");
                        pelvwarePort.write('GetWifiList')

                    break;

                    case "ConectionTimeOut":

                        // DO SOMETHING

                    break;
                    
                    case "Connected":

                        configStatus = 3;

                    break;

                    default:

                        if( configStatus == 2 ){

                            limparLista();

                            // TODO: Checa se isso aqui não vai dar problema
                            let ssidList = data.split(";");
                            let id = 0;

                            ssidList.forEach( ( ssid ) => {

                                if( id == 0 ){
                                    
                                    adicionaLinhaLista(ssid, true);
                                    ssidSelecionado = ssid;
                                }
                                else{
                                    adicionaLinhaLista(ssid, false);
                                }
                                    
                                id++;

                            });
                            
                            wifiList.style.display = "table";
                            title.style.display = "block";
                            divButtons.style.display = "block";
                            wifiList.style.display = "table";
                            loadingCircle.style.display = "none";
                            //console.log(ssidList);
                            
                        }
                        else if(configStatus == 3){

                            pelvwareIP = data;
                            console.log("Pelvware IP: " + pelvwareIP)

                            configStatus = 4;

                            // Disable all buttons here!
                            disableAllButtons();
                            loadingCircle.style.display = "none";
                            finishLabel.style.display = "block";

                        }
                    
                    break;

                }

            });

        });
    }
    else{

        alert('TimeOut: Pelvware não detectada, tente novamente.')

    }

    //console.log("Limpando Intervalo !!")
    clearTimeout(tbuscaPorta);
})

async function getPorts(){

    try {

        const resultado = await serialPort.list();
    
        //console.log("Portas Encontradas: ")
        
        //resultado.forEach( (ports) => {
    
            //console.log( ports.path )
            /*if(ports.manufacturer == 'wch.cn')
                pelvPort = ports.path;
                console.log('Pelvware Conectado ! Iniciando Recepção de Dados...');*/
                
        //} );

        return resultado;
            
        /*texto.innerHTML = `Pelvware conectado na porta: ${pelvPort}`;
    
        pelvSerialPort = new serialPort(pelvPort, function (err) {
            
            if (err) {
                return console.log('Error: ', err.message)
            }
            
            baudRate: 9600
            })
        
        //pelvSerialPort.flush();
    
        // Switches the port into "flowing mode"
        pelvSerialPort.on('data', function (data) {
    
            //console.log('Data:', parseFloat(data))
                        
            // Publisher - emissor
            meuEvento.emit('dadoschegando', parseFloat(data), 0)
        })*/
    
    } catch (e) {
        
        alert(`Problema ao buscar portas seriais: ${e.message}`)
    
    }

}

// TODO: Create function to detects connection lost.
