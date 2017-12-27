//reset a form
function reset(form){
	document.getElementById(form).reset();
}

//submit a form (post)
function submitForm(form){
	document.getElementById(form).submit();	
}

//add a new option to the poll form
function addOption(){
	var container = document.getElementById("extraOptions");
	var num = container.childElementCount + 3;
	var str = '<div class="form-group mb-md">'+
				'<label for="option'+num+'" class="col-xs-1 control-label">Option '+num+'</label>'+
                '<div class="col-xs-10">'+
                	'<input maxlength="100" type="text" class="form-control" name="option'+num+'" id="option'+num+'" placeholder="Option '+num+'" required>'+
                '</div>'+
                '<div class="col-xs-1">'+
					'<a href="#" onclick="deleteOption('+(num-3)+')" class="button-icon"><i class="ti ti-close"></i></a>'+
                '</div>'+
            '</div>';
	//create the new div
	var div = document.createElement("div");
	div.innerHTML = str;
	div = div.firstChild;
	container.appendChild(div);
}

//delete an added option from the poll form
function deleteOption(num){
	var container = document.getElementById("extraOptions");
	//remove the desired child
	container.removeChild(container.childNodes[num]);
	//rename the remaining childs
	for(var i = num; i < container.childNodes.length; i++){
		var added = i+3;
		var label = (container.childNodes[i]).childNodes[0];
		label.innerHTML = 'Option '+added;
		label.htmlFor = "option"+added;
		var input = ((container.childNodes[i]).childNodes[1]).childNodes[0];
		input.setAttribute('name', 'option'+added);
		input.id = 'option'+added;
		input.placeholder = 'Option '+added;
		var anchor = ((container.childNodes[i]).childNodes[2]).childNodes[0];
		anchor.setAttribute('onclick', 'deleteOption('+i+')');
	}
}


function setTitleDelete(id, name){
	var title = document.getElementById("modalDeleteTitle");
	title.innerText = "The poll with the following title will be deleted: \n" + name;
	var button = document.getElementById("deletePollButton");
	button.setAttribute("href", "/delete/"+id);
}
