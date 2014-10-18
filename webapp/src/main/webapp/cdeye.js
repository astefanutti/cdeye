var xhr = new XMLHttpRequest();
xhr.open("GET", "cdeye/beans");
xhr.setRequestHeader('Accept', 'application/json');
xhr.onreadystatechange = function(event) {
    if(xhr.readyState === 4)
        if (xhr.status === 200)
            display();
        else
            alert("CDEye not accessible!");
};
xhr.send();

function display() {
    var beans = JSON.parse(xhr.responseText);

    var div = document.getElementById("beans");
    div.innerHTML = "";
    for (var i = 0; i < beans.bean.length; i++) {
        div.innerHTML += beans.bean[i].className + "<br/>";
    }
}