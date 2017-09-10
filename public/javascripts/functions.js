/*function topNav() {
    var x = document.getElementById("TopNav");
    if (x.className === "topnav") {
        x.className += " responsive";
    } else {
        x.className = "topnav";
    }
}
*/

function reset(form){
	document.getElementById(form).reset();
}

function submitForm(form){
	document.getElementById(form).submit();	
}