(function($) {
	"use strict";

	var Admin = {
		
		init: function(){
			this.imgToSvg();
		},
		
		imgToSvg: function(){
			$('img.mediamatic_be_svg').each(function(){
				var $img 		= $(this);
				var imgClass	= $img.attr('class');
				var imgURL		= $img.attr('src');
				$.get(imgURL, function(data) {
					var $svg = $(data).find('svg');
					if(typeof imgClass !== 'undefined') {$svg = $svg.attr('class', imgClass+' replaced-svg');}
					$svg = $svg.removeAttr('xmlns:a');
					$img.replaceWith($svg);
				}, 'xml');
			});
		}
		
	};
	
	$(document).ready(function(){Admin.init();});

})( jQuery );
