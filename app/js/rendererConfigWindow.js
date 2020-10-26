const {ipcRenderer, contentTracing} = require('electron');
const serialPort = require('serialport')
const {EventEmitter} = require('events')

class Evento extends EventEmitter{}

// System buttons
const btnClose = document.getElementById("btn_close");

// ConfigGUI Components
const btnAutoConnect = document.getElementById("btn_autoConnect");
const tableWifiList = document.getElementById("tab_wifiList");
tableWifiList.style.display = "none";

btnClose.onclick = function()
{
    ipcRenderer.send('close-me');
    //ipcRenderer.send('closeConfigStartMain');
};

btnAutoConnect.onclick = function()
{
    const meuEvento = new Evento()

    let counter = 10;
    let firstCheck = true;
    let firstCheckValue = null;
    
    function iniciarBusca(){
    
        if( counter == 0 ){
    
            // Publisher - emissor
            meuEvento.emit('interromperBusca');
    
        }
    
        counter--;
    }

    async function verificarPortas(){
        
        let portsFound = await getPorts();

        console.log(`Quantidade de portas encontradas: ${portsFound.length}`)

        if( firstCheck ){
            firstCheckValue = portsFound.length;
            firstCheck = false;
        }

        if( portsFound.length > firstCheckValue /* and NewPortName == 'Pelvware' */ ){

            // Publisher - emissor
            meuEvento.emit('interromperBusca', true);
    
        }

    }
    
    const tIniciarBusca = setInterval(iniciarBusca, 5000);
    const tbuscaPorta = setInterval(verificarPortas, 1000);
    
    // Subscriber - assinante
    meuEvento.on('interromperBusca', (found) =>{
        
        if( found ){

            alert('Pelvware Encontrada, Iniciando Configuração.')

        }
        else{

            alert('TimeOut: Pelvware não detectada, tente novamente.')

        }

        clearTimeout(tbuscaPorta);
        clearTimeout(tIniciarBusca);
    })
};

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

getPorts();