const {ipcRenderer, contentTracing} = require('electron');
const serialPort = require('serialport')
const readline = require('@serialport/parser-readline')
const {EventEmitter} = require('events')

class Evento extends EventEmitter{}

const counterTimes   = 20;  // Default: 10 Times
const checkTime      = 1;   // Default: 1 Second
const pelvwareBaudRate = 115200; // Default Wemos Baud Rate
var configStatus = 0;
var pelvwarePort = null;

/*const port = new SerialPort('/dev/tty-usbserial1', {
    baudRate: 57600
  })*/

// System buttons
const btnClose = document.getElementById("btn_close");

// ConfigGUI Components
const btnAutoConnect = document.getElementById("btn_autoConnect");
const tableWifiList = document.getElementById("tab_wifiList");
const loadingCircle = document.getElementById("loadingCircle");
const buttomConnectInner = '<span class="icon icon-plus icon-text" id></span>Auto-Connect';

tableWifiList.style.display = "none";
loadingCircle.style.display = "none";

btnClose.onclick = function()
{
    ipcRenderer.send('close-me');
    //ipcRenderer.send('closeConfigStartMain');
};

const meuEvento = new Evento()
var tbuscaPorta = null;

var firstCheck = true;
var counter = counterTimes;
var firstCheckValue = null;

btnAutoConnect.onclick = function()
{    
    let startConfig = true;

    if( configStatus > 0 ){

        if( confirm("Tem certeza que deseja reiniciar a configuração da Pelvware?") ){
            // Reiniciar configuração
            alert("Remova a USB da Pelvware, feche este alerta e insira novamente.");
            startConfig = true;
        }
        else{
            startConfig = false;
        }
    }

    if( startConfig ){
        firstCheck = true;
        counter = counterTimes;
        firstCheckValue = null;
        btnAutoConnect.innerHTML = buttomConnectInner + " " + counterTimes + "s";
        
        btnAutoConnect.classList.add("active");
        btnAutoConnect.disabled = true;
        tableWifiList.style.display = "none";

        tbuscaPorta = setInterval(verificarPortas, checkTime * 1000);
    }

};

function adicionaLinhaTabela(id, ssid){

    
    let tbodyTableWifiList = tableWifiList.getElementsByTagName('tbody')[0];

    let numeroLinhas = tbodyTableWifiList.rows.length;
    let linha = tbodyTableWifiList.insertRow(numeroLinhas);

    let celula1 = linha.insertCell(0);
    let celula2 = linha.insertCell(1);   

    celula1.innerHTML = id; 
    celula2.innerHTML =  ssid;
}

// funcao remove uma linha da tabela
function removeLinhaTabela(linha) {

  var i = linha.parentNode.parentNode.rowIndex;
  document.getElementById('tab_wifiList').deleteRow(i);

}      

async function verificarPortas(){
    
    let portsFound = await getPorts();

    console.log(`Quantidade de portas encontradas: ${portsFound.length}`)

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

        btnAutoConnect.innerHTML = buttomConnectInner + " " + counter + "s";

        if( counter == 0 ){

            // Publisher - emissor
            meuEvento.emit('interromperBusca');
        }
    }

}

// Subscriber - assinante
meuEvento.on('interromperBusca', (found, path) =>{
    
    console.log("Ativou o Evento !")
            
    btnAutoConnect.innerHTML = buttomConnectInner;
    btnAutoConnect.classList.remove("active");
    btnAutoConnect.disabled = false;

    if( found ){

        alert(`Pelvware Encontrada, Iniciando Configuração da Porta: ${path}`)

        pelvwarePort = new serialPort(path, { baudRate: pelvwareBaudRate });

        const parser = pelvwarePort.pipe(new readline({ delimiter: '\r\n' }))
        
        // The open event is always emitted
        pelvwarePort.on('open', function() 
        {
            console.log("A porta foi aberta !");

            pelvwarePort.flush();
        
            parser.on('ready', () => {

                console.log('Novo Dado Recebido !');

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
                        pelvwarePort.write('GetWifiList')

                    break;

                    case "ConnectionError":

                        console.log("Falha na Conexão !");

                    break;

                    case "SSIDFormatError":

                        console.log("Falha no formato do SSID !");

                    break;

                    case "SSIDOrPasswordError":

                        console.log("Senha ou SSID Incorretos");

                    break;

                    default:

                        if( configStatus == 2 ){

                            // TODO: Checa se isso aqui não vai dar problema
                            let ssidList = data.split(";");
                            let id = 0;

                            ssidList.forEach( ( ssid ) => {

                                adicionaLinhaTabela(id, ssid);
                                id++;

                            });
                            
                            tableWifiList.style.display = "table";
                            loadingCircle.style.display = "none";
                            console.log(ssidList);
                            
                        }
                    
                    break;

                }

            });

        });
    }
    else{

        alert('TimeOut: Pelvware não detectada, tente novamente.')

    }

    console.log("Limpando Intervalo !!")
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
