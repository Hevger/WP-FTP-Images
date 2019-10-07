
var themedo_trigger_folder = {};


(function ($) {
	"use strict";
	
	
	var Popup = {
		
		deleteFolderOops: function(){
			
			var html = '<div id="mediamatic_be_confirm">';
					html += '<div class="confirm_inner">';
						html += '<div class="desc_holder">';
							html += '<h3>' + mediamatic_translate.oops + '</h3>';
							html += '<p>' + mediamatic_translate.folder_are_sub_directories + '</p>';
						html += '</div>';
						html += '<div class="links_holder">';
							html += '<a class="no" href="#">' + mediamatic_translate.cancel + '</a>';
						html += '</div>';
					html += '</div>';
				html += '</div>';
							
							
			
			$('#mediamatic_be_confirm').remove();
			$('body').prepend(html);
			
			var confirm 		= $('#mediamatic_be_confirm');
			confirm.addClass('opened folder_delete');
			var cancelActionBtn	= $('#mediamatic_be_confirm').find('a.no');

			
			cancelActionBtn.on('click', function () {
				confirm.removeClass();
				
				$('#mediamatic_be_confirm').remove();
				return false;
			});
		},
		
		errorPopup: function(text){
			
			var html = '<div id="mediamatic_be_confirm">';
					html += '<div class="confirm_inner">';
						html += '<div class="desc_holder">';
							html += '<h3>' + mediamatic_translate.error + '</h3>';
							html += '<p>' + text + '</p>';
						html += '</div>';
						html += '<div class="links_holder">';
							html += '<a class="yes green" href="#">' + mediamatic_translate.reload + '</a>';
						html += '</div>';
					html += '</div>';
				html += '</div>';
							
							
			
			$('#mediamatic_be_confirm').remove();
			$('body').prepend(html);
			
			var confirm 		= $('#mediamatic_be_confirm');
			confirm.addClass('opened folder_delete');
			var cancelActionBtn	= $('#mediamatic_be_confirm').find('a.yes');

			
			cancelActionBtn.on('click', function () {
				confirm.removeClass();
				$('#mediamatic_be_confirm').remove();
				location.reload();
				return false;
			});
		},
		
		deleteFolderConfirm: function(e_id){

			var html = '<div id="mediamatic_be_confirm">';
					html += '<div class="confirm_inner">';
						html += '<div class="desc_holder">';
							html += '<h3>' + mediamatic_translate.are_you_sure + '</h3>';
							html += '<p>' + mediamatic_translate.not_able_recover_folder + '</p>';
						html += '</div>';
						html += '<div class="links_holder">';
							html += '<a class="yes" href="#">' + mediamatic_translate.yes_delete_it + '</a>';
							html += '<a class="no" href="#">' + mediamatic_translate.cancel + '</a>';
						html += '</div>';
					html += '</div>';
				html += '</div>';
							
							
			$('#mediamatic_be_confirm').remove();
			$('body').prepend(html);
			
			var confirm 		= $('#mediamatic_be_confirm');
			confirm.addClass('opened folder_delete');
			var doActionBtn		= $('#mediamatic_be_confirm').find('a.yes');
			var cancelActionBtn	= $('#mediamatic_be_confirm').find('a.no');

			
			doActionBtn.off().on('click', function (e) {
				e.preventDefault();
				
				themedo_trigger_folder.delete(e_id);
				
				$('#mediamatic_be_confirm').remove();
				return false;
			});
			cancelActionBtn.on('click', function () {
				confirm.removeClass();
				
				$('#mediamatic_be_confirm').remove();
				return false;
			});
		}
	};

	

	themedo_trigger_folder.jQueryExtensions = function () {
		
		

		$.fn.extend({

			move_folder: function () {
				return this.each(function () {
					var item = $(this),
						depth = parseInt(item.menuItemDepth(), 10),
						parentDepth = depth - 1,
						parent = item.prevAll('.menu-item-depth-' + parentDepth).first();
					var new_parent = 0;
					if (0 !== depth) {
						new_parent = parent.find('.menu-item-data-db-id').val();
					}
					


					var current = item.find('.menu-item-data-db-id').val();
					themedo_trigger_folder.updateFolderList(current, new_parent, 'move');
				});
			}

		});
	}();


	themedo_trigger_folder.rename = function (current, new_name) {

		mediamaticWMC.mediamatic_begin_loading();
		
		

		var jdata = {
			'action': 'mediamatic_ajax_update_folder_list',
			'current': current,
			'new_name': new_name,
			'type': 'rename'
		};

		$.post(ajaxurl, jdata, function (response) {

			if (response == 'error') {

				Popup.errorPopup(mediamatic_translate.this_folder_is_already_exists);

			}

		}).fail(function () {
			
			Popup.errorPopup(mediamatic_translate.error_occurred);
			

		}).complete(function () {
			mediamaticWMC.mediamatic_finish_loading();
		});


	};

	themedo_trigger_folder.delete = function (current) {

		mediamaticWMC.mediamatic_begin_loading();

		var data = {
			'action': 'mediamatic_ajax_delete_folder_list',
			'current': current,
		};
		//2. Delete folder
		$.post(ajaxurl, data, function (response) {
			if (response == 'error') {
				
				Popup.errorPopup(mediamatic_translate.folder_cannot_be_delete);
			}


		}).fail(function () {
			
			Popup.errorPopup(mediamatic_translate.error_occurred);
			
		}).success(function (response) {

			mediamaticWMC.updateCountAfternDeleteFolder(response);
			$('.menu-item.uncategory .jstree-anchor').addClass('need-refresh');

			if (current == localStorage.getItem("current_folder")) {
				localStorage.removeItem("current_folder");
			}

			var parent_id = $('#menu-item-' + current).find('.menu-item-data-parent-id').val();

			if (parent_id) {

				if (!$(".menu-item .menu-item-data-parent-id").filter(function () {

					return ($(this).val() == parent_id);

				}).length) {

					$("#menu-item-" + parent_id + " .sub_opener").removeClass('open close');
				}

			}

			$('#menu-item-' + current).remove();

			mediamaticWMC.mediamatic_finish_loading();
		});


	};

	themedo_trigger_folder.new = function (name, parent) {

		mediamaticWMC.mediamatic_begin_loading();

		var data = {
			'action': 'mediamatic_ajax_update_folder_list',
			'new_name': name,
			'parent': parent,
			'folder_type': 'default',
			'type': 'new'
		};

		//2. Delete folder
		$.post(ajaxurl, data, function (response) {
			if (response == 'error') {
				
				Popup.errorPopup(mediamatic_translate.folder_cannot_be_delete);
			}



		}).fail(function () {
			
			Popup.errorPopup(mediamatic_translate.error_occurred);
			
		}).success(function (response) {

			mediamatic_taxonomies.folder.term_list.push({ term_id: response.data.term_id, term_name: "new tmp folder" });
			var $mediamatic_sidebar = $('.mediamatic_sidebar');
			var backbone = mediamaticWMC.mediamaticWMCgetBackboneOfMedia($mediamatic_sidebar);

			if (typeof backbone.view === "object") {
				var mediamatic_Filter = backbone.view.toolbar.get("folder-filter");
				if (typeof backbone.view === "object") {
					mediamatic_Filter.createFilters();
				}
			}

			var $new_option = $("<option></option>").attr("value", response.data.term_id).text('new tmp folder');
			$(".wpmediacategory-filter").append($new_option);
			$(".jstree-anchor.jstree-clicked").removeClass('jstree-clicked');
			


			themedo_trigger_folder.update_folder_position();
			mediamaticWMC.mediamatic_finish_loading();
		});


	};

	themedo_trigger_folder.updateFolderList = function (current, new_parent, type) {

		var jdata = {
			'action': 'mediamatic_ajax_update_folder_list',
			'current': current,
			'new_name': 0,
			'parent': new_parent,
			'type': type,
			'folder_type': 'folder'
		};

		$.post(ajaxurl, jdata, function (response) {

			if (response == 'error') {

				Popup.errorPopup(mediamatic_translate.this_folder_is_already_exists);
				

			} else {
				themedo_trigger_folder.update_folder_position();

				$('.need-refresh').trigger("click");
			}
		}).fail(function () {

			Popup.errorPopup(mediamatic_translate.error_occurred);
			
		});


	};

	themedo_trigger_folder.update_folder_position = function () {

		mediamaticWMC.mediamatic_begin_loading();
		var result = "";
		var str = '';
		$("#themedo-mediamatic-folderTree .menu-item-data-db-id").each(function () {
			str += '0'

			if (result != "") {
				result = result + "|";
			}
			result = result + $(this).val() + "," + str;

		});

		var data = {
			'action': 'mediamatic_ajax_update_folder_position',
			'result': result
		}

		// 3. Update position for folder order
		$.post(ajaxurl, data, function (response) {
			if (response == 'error') {
				
				var text = mediamatic_translate.something_not_correct + mediamatic_translate.this_page_will_reload;
				Popup.errorPopup(text);
				
			}
			mediamaticWMC.mediamatic_finish_loading();
		}).fail(function () {
			
			Popup.errorPopup(mediamatic_translate.error_occurred);
			
		}).success(function (response) {

			var current_folder_id = $('.wpmediacategory-filter').val();
			$('#menu-item-' + current_folder_id + ' .jstree-anchor').addClass('need-load-children');
			$('#menu-item-' + current_folder_id + ' .jstree-anchor').trigger('click');

		});
	};

	themedo_trigger_folder.filter_media = function ($element) {
		
		if ($element == null) {

		} else {

			
			var catId = $element.closest('.menu-item').data('id');
			if ($('.need-refresh').length) {

				var $mediamatic_sidebar = $('.mediamatic_sidebar');

				var backbone = mediamaticWMC.mediamaticWMCgetBackboneOfMedia($mediamatic_sidebar);

				if (backbone.browser.length > 0 && typeof backbone.view == "object") {
					// Refresh the backbone view
					try {
						backbone.view.collection.props.set({ ignore: (+ new Date()) });
					} catch (e) { console.log(e); };
				} else {
					
				}
				$('.need-refresh').removeClass('need-refresh');

			}
			//trigger category on topbar
			$('.wpmediacategory-filter').val(catId);
			$('.wpmediacategory-filter').trigger('change');
			$('.attachments').css('height', 'auto');


		}

	};

	themedo_trigger_folder.getChildFolder = function (folder_id) {

		if ($('.themedo-mediamatic-container').length) {

			$('.themedo-mediamatic-container').remove();

		}

		var data = {
			'action': 'mediamatic_ajax_get_child_folders',
			'folder_id': folder_id,
		};

		$.post(ajaxurl, data, function (response) {


		}).fail(function () {


		}).success(function (response) {

			themedo_folder_in_content.render(response.data);
		});

	};

	$('#themedo-mediamatic-folderTree .jstree-anchor').dblclick(function (e) {
		e.preventDefault();
	});
	
	

	var THEMEDO_DELAY = 200, themedo_clicks = true, themedo_timer = null;
	//check truong hop click va double click
	$(document).on('click', '.mediamatic_sidebar .jstree-anchor', function () {

		var $this = $(this), folder_id = $this.closest('.menu-item').data('id');
		
		if (themedo_clicks !== false) {
			
			themedo_clicks = false;
			
			if ($('select[name="themedo_mediamatic_folder"]').length) {//list mode
				$('select[name="themedo_mediamatic_folder"]').val(folder_id);
				if ($('.mediamatic_be_loader').hasClass('loading')) {
					return;
				}
				mediamaticWMC.mediamatic_begin_loading();
				themedo_timer = setTimeout(function () {
					var form_data = $('#posts-filter').serialize();
					$.ajax({
						url: mediamaticConfig.upload_url,
						type: 'GET',
						data: form_data,
					})
						.done(function (html) {
							window.history.pushState({}, "", mediamaticConfig.upload_url + '?' + form_data);
							themedo_after_loading_media(html, folder_id);
							themedo_clicks = true;
						})
						.fail(function () {
							mediamaticWMC.mediamatic_finish_loading();
							console.log("error");
							themedo_clicks = true;
						});
					oldCurrentFolder = localStorage.getItem("current_folder");

				}, THEMEDO_DELAY);
			} else {
				themedo_timer = setTimeout(function () {
					themedo_trigger_folder.filter_media($this);

					if (oldCurrentFolder != localStorage.getItem("current_folder") || $this.hasClass('need-load-children')) {
						themedo_trigger_folder.getChildFolder(folder_id);
						$this.removeClass('need-load-children');
					}
					oldCurrentFolder = localStorage.getItem("current_folder");

					themedo_clicks = true;

				}, THEMEDO_DELAY);
			}
		}
//		else {
//			clearTimeout(themedo_timer);    //prevent single-click action
//			$('.js_mediamatic_rename').trigger('click');  //perform double-click action
//			themedo_clicks = 0;             //after action performed, reset counter
//		}
	});
	
	
	$(document).on('click', '.pagination-links a', function (event) {
		event.preventDefault();
		var $this = $(this);
		if ($('.mediamatic_be_loader').hasClass('loading')) {
			return;
		}
		mediamaticWMC.mediamatic_begin_loading();
		$.ajax({
			url: $this.attr('href'),
			type: 'GET',
			data: {},
		})
			.done(function (html) {
				window.history.pushState({}, "", $this.attr('href'));
				themedo_after_loading_media(html, $('select[name="themedo_mediamatic_folder"]').val());
			})
			.fail(function () {
				mediamaticWMC.mediamatic_finish_loading();
				console.log("error");
			});
		return false;
	});
	
	
	$(document).on('submit', '#posts-filter', function (event) {
		event.preventDefault();
		var $this = $(this);
		if ($('.mediamatic_be_loader').hasClass('loading')) {
			return;
		}
		mediamaticWMC.mediamatic_begin_loading();
		var form_data = $('#posts-filter').serialize();
		$.ajax({
			url: mediamaticConfig.upload_url,
			type: 'GET',
			data: form_data,
		})
			.done(function (html) {
				window.history.pushState({}, "", mediamaticConfig.upload_url + '?' + form_data);
				themedo_after_loading_media(html, $('select[name="themedo_mediamatic_folder"]').val());
			})
			.fail(function () {
				mediamaticWMC.mediamatic_finish_loading();
				console.log("error");
			});
		return false;
	});
	
	function themedo_after_loading_media(html, folder_id) {
		$('.wrap').html($(html).find('.wrap').html());
		$('#folders-to-edit li').removeClass('current_folder');
		$('ul.jstree-container-ul li').removeClass('current-dir current_folder');

		//set curret folder
		if (folder_id == '' || folder_id == null) {
			$('#menu-item-all').addClass('current-dir');
		} else if (folder_id == '-1') {
			$('#menu-item--1').addClass('current-dir');
		} else {
			$('#menu-item-' + folder_id).addClass('current_folder');
		}
		//set folder select
		$.each(mediamatic_taxonomies.folder.term_list, function (index, el) {
			$('.wpmediacategory-filter').append('<option value="' + el.term_id + '">' + el.term_name + '</option>');
		});
		$('.wpmediacategory-filter').val(folder_id);
		//add behavior
		var drag_item = $("#themedo-mediamatic-attachment");
		var text_drag = mediamatic_translate.move_1_file;
		$.each($('table.wp-list-table tr'), function (index, el) {
			$(el).drag("start", function () {
				var selected_files = $('.wp-list-table input[name="media[]"]:checked');
				if (selected_files.length > 0) {
					text_drag = mediamatic_translate.Move + ' ' + selected_files.length + ' ' + mediamatic_translate.files;
				}
				
				drag_item.html(text_drag);
				drag_item.show();
				$('body').addClass('themedo-draging');
			})
				.drag("end", function () {
					drag_item.hide();
					$('body').removeClass('themedo-draging');
					text_drag = mediamatic_translate.move_1_file;
				})
				.drag(function (ev, dd) {
					var id = $(this).attr("id");
					id = id.match(/post-([\d]+)/);
					drag_item.data("id", id[1]);
					drag_item.css({
						"top": ev.clientY - 15,
						"left": ev.clientX - 15,
					});
				});
		});
		//remove loading
		mediamaticWMC.mediamatic_finish_loading();
	}
})(jQuery);