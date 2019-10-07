(function( $ ) {
	"use strict";

	$(document).ready(function(){

		var Attachment = wp.media.view.Attachment.Library;

		var text_drag = mediamatic_translate.move_1_file;
		
		$("body").append('<div id="themedo-mediamatic-attachment" data-id="">'+text_drag+'</div>');

		var drag_item = $("#themedo-mediamatic-attachment");
		$.each(mediamatic_taxonomies.folder.term_list, function(index, el) {
			$('.wpmediacategory-filter').append('<option value="'+el.term_id+'">'+el.term_name+'</option>');
		});
		$('.wpmediacategory-filter').val(mediamaticConfig3.current_folder);

		dh_add_drag_behavior();
		$("#wpcontent").on("drop", ".jstree-anchor", function(event){
			var des_folder_id = $(this).parent().attr('data-id');
			var ids = themedo_get_seleted_files();
			if(ids.length){
				themedo_move_multi_attachments(ids, des_folder_id, event);
			}else{
				themedo_move_1_attachment(event, des_folder_id);
			}
		});//#wpcontent
		function dh_add_drag_behavior()
		{
			$.each($('table.wp-list-table tr'), function(index, el) {
				$(el).drag("start",function(){
					var $this = $(this);

					var selected_files = $('.wp-list-table input[name="media[]"]:checked');
					if(selected_files.length > 0){
						text_drag = mediamatic_translate.Move + ' ' + selected_files.length + ' ' + mediamatic_translate.files;
					}
					drag_item.html(text_drag);
					drag_item.show();
					$('body').addClass('themedo-draging');
				})
				.drag("end",function(){
					drag_item.hide();
					$('body').removeClass('themedo-draging');
					text_drag = mediamatic_translate.move_1_file;
				})
				.drag(function( ev, dd ){
					var id = $(this).attr("id");
					id = id.match(/post-([\d]+)/);
					drag_item.data("id", id[1]);
					drag_item.css({
						"top" : ev.clientY - 15,
						"left" : ev.clientX - 15,
					});
				});
			});
		}
		function themedo_get_seleted_files(){
			var selected_files = $('.wp-list-table input[name="media[]"]:checked');
			var ids = [];
			if(selected_files.length){
				selected_files.each(function(index, item) {
				    ids.push($(item).val());
				});
				return ids;
			}
			return false;
		}//themedo_get_seleted_files

		function themedo_move_multi_attachments(ids, des_folder_id, event){

			$(event.target).addClass("need-refresh");
              	
				var data = {};

				data.ids = ids;

				data.folder_id = des_folder_id;

				data.action = 'mediamaticSaveMultiAttachments';
				mediamaticWMC.mediamatic_begin_loading();

				$.each(data.ids, function(index, el) {
      				$('#post-' + el).addClass('themedo-opacity');
      			});

				jQuery.ajax({
	             	type : "POST",
	              	dataType: 'json',
	              	data : data,
	              	url : ajaxurl,
	              	success: function (res){
	              		if(res.success){
	              			res.data.forEach(function(item){
	              				mediamaticWMC.updateCount(item.from, item.to);
	              			});
	              			$('.jstree-anchor').addClass("need-refresh");
	              			//remove items
	              			if ($('.wpmediacategory-filter').val() != null) {
	              				$.each(data.ids, function(index, el) {
		              				$('#post-' + el).remove();
		              			});
		              			var length = $('.wp-list-table tbody tr').length;
			              		if (length == 0) {
				              		$('.wp-list-table tbody').append(mediamaticConfig3.no_item_html);
				              		$('.displaying-num').hide();
				              	} else {
				              		$('.displaying-num').text(length + ' ' + (length == 1 ? mediamaticConfig3.item : mediamaticConfig3.items));
				              	}
	              			}
	              		}
	              		$('.wp-list-table tbody tr').removeClass('themedo-opacity');
		              	mediamaticWMC.mediamatic_finish_loading ();
		                
	              	}
		         });// ajax 2



		}//themedo_move_multi_attachments

		function themedo_move_1_attachment(event, des_folder_id){

			var attachment_id = drag_item.data("id");		

			var attachment_item = $('.attachment[data-id="' + attachment_id + '"]');

			

			var current_folder = $( ".wpmediacategory-filter" ).val();
			if(des_folder_id === 'all' || des_folder_id == current_folder){
				$('.wp-list-table tbody tr').removeClass('themedo-opacity');
				return;
			}

			mediamaticWMC.mediamatic_begin_loading ();
			$('#post-' + attachment_id).addClass('themedo-opacity');
			jQuery.ajax({
              type : "POST",
              dataType: 'json',
              data : {id: attachment_id, action: 'mediamaticGetTermsByAttachment', nonce: mediamaticConfig3.nonce},
              url : ajaxurl,
              success: function (resp){
              	// get terms of attachment
              	var terms = Array.from(resp.data, v => v.term_id);
              	//check if drag to owner folder
              
              	if(terms.includes(Number(des_folder_id))){
              		mediamaticWMC.mediamatic_finish_loading ();
              		$('.wp-list-table tbody tr').removeClass('themedo-opacity');
              		return;
              	}

              	$(event.target).addClass("need-refresh");
              	
				var data = {};

				data.id = attachment_id;

				
				data.attachments = {};

				data.attachments[attachment_id] = { menu_order: 0};

				data.folder_id = des_folder_id;

				data.action = 'mediamaticSaveAttachment';

				jQuery.ajax({
	             	type : "POST",
	              	dataType: 'json',
	              	data : data,
	              	url : ajaxurl,
	              	success: function (res){

	              		if(res.success){
							$.each(terms, function(index, value){
	              				
	              				mediamaticWMC.updateCount(value, des_folder_id);
							});
	              			//console.log(current_folder, terms.length);	
		              		//if attachment not in any terms (folder)
		              		if(current_folder === 'all' && !terms.length){
		              			
		              			mediamaticWMC.updateCount(-1, des_folder_id);
		              		}
		              		
		              		if(current_folder == -1){
		              		
		              			mediamaticWMC.updateCount(-1, des_folder_id);
		              		}

							if(current_folder != 'all' ){

								attachment_item.detach();
							}
							
	              		}

		              	mediamaticWMC.mediamatic_finish_loading();
		              	$('.wp-list-table tbody tr').removeClass('themedo-opacity');
		              	//remove item
		              	if ($('.wpmediacategory-filter').val() != null) {
		              		$('#post-' + data.id).remove();
		              		var length = $('.wp-list-table tbody tr').length;
		              		if (length == 0) {
			              		$('.wp-list-table tbody').append(mediamaticConfig3.no_item_html);
			              		$('.displaying-num').hide();
			              	} else {
			              		$('.displaying-num').text(length + ' ' + (length == 1 ? mediamaticConfig3.item : mediamaticConfig3.items));
			              	}
		              	}
		              	
		              	
		                
	              	}
		         });// ajax 2
				

              }
          	});//ajax 1
		} //themedo_move_1_attachment

		

		$('.menu-item-bar').on({

			mouseenter: function() {
		        var $this = $(this);
			    var parentWidth = $this.find('.item-title').innerWidth();
			    var childWidth = $this.find('.menu-item-title').innerWidth();
			   	var title = 	$this.find('.menu-item-title').text();
			   	
			     if (parentWidth < (childWidth + 10) ) {
			     	
			         $this.tooltip({
			             title: title,
			             placement: "bottom",
							
			         });
			         $this.tooltip('show');
			     }
		    },
		    mouseleave: function() {
		        var $this = $(this);
	    		$this.tooltip('hide');
		    }

		});


	});//ready

		
	

})( jQuery );