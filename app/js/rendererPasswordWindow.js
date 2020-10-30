const {ipcRenderer} = require('electron');

// System buttons
const btnClose = document.getElementById("btn_close");
const btnConnect = document.getElementById("btn_connect");
const btnCancel = document.getElementById("btn_cancel");
const inputPassword = document.getElementById("i_password");

btnClose.onclick = function()
{
    ipcRenderer.send('closePasswordWindow');
};

btnConnect.onclick = function()
{
    let password = inputPassword.value
    
    if(password){                           // If need some validate, insert here.
        //alert("Senha: " + password);
        ipcRenderer.send('passwordToMain', password);
    }

};

btnCancel.onclick = function()
{
    ipcRenderer.send('closePasswordWindow');
};