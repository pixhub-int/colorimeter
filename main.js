
// инициализация объекта для выборщика цвета
(function () {

	// работа с увеличением масштаба выборщика
	function onWheel(e) {
		
		if (!e.ctrlKey || !ViewerImgControl.isLocked) { return; };
		
		e.preventDefault();

		// wheelDelta не дает возможность узнать количество пикселей
		// и не надо, главное — направление
		var delta = e.deltaY || e.detail || e.wheelDelta;
		var info = document.getElementById('delta');
		
		var x, y;

		x = ViewerImgControl.x;
		y = ViewerImgControl.y;

		if (delta < 0) {
			ViewerImgControl.zoom++;
		}
		else if (delta > 0) {
			ViewerImgControl.zoom--;
		};
		
		if (ViewerImgControl.zoom < 2) {
			ViewerImgControl.zoom = 2;
		}
		else {
			ViewerImgControl.updateCursor();
		};

		ViewerImgControl.movement.x = ViewerImgControl.zoomPayoff(x);
		ViewerImgControl.movement.y = ViewerImgControl.zoomPayoff(y);
	};

	// обработчик колеса мыши
	// https://learn.javascript.ru/mousewheel
	document.body.addEventListener('wheel', onWheel);
	
	var ViewerImgControl = colorimeter({
		elem: '.Img',
		requestWay: function (cur) {
			cur.img.addEventListener('click', function (e) {
				if (!e.ctrlKey) { return; };
				
				cur.lockStart(e);
			});
		},
		clickCallback: function (cur) {
			prompt('', cur.pixelColor);
		}
	});
})();


// добавление возможности смены изображения
// по перетягиванию
document.body.addEventListener('drop', function (e) {
	onFile(e);
	this.classList.remove('Page--onDragOver');
});
document.body.addEventListener('dragover', function handleDragOver(e) {
	e.stopPropagation();
	e.preventDefault();
	e.dataTransfer.dropEffect = 'copy';
	this.classList.add('Page--onDragOver');
});
document.body.addEventListener('dragleave', function handleDragOver(e) {
	this.classList.remove('Page--onDragOver');
});

// по двойному нажатию
document.body.addEventListener('dblclick', function () {
	Input.click();
});
Input.addEventListener('change', onFile);

// по вставке из буфера
Paste.init(document.body)[0].addEventListener('pasteImage', function (e) {
		var src = URL.createObjectURL(e.detail.blob);
		
		document.querySelector('.Img').src = src;
});

// открытие файла
function onFile (e) {
	e.preventDefault();
	
	var file = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
	
	if (file && file.type && file.type.match('image.*')) {
		var src = URL.createObjectURL(file);
		
		document.querySelector('.Img').src = src;
	}
};
