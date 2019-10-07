(function ($) {
	"use strict";

	$(document).ready(function () {

		var Attachment = wp.media.view.Attachment.Library;
		
		var text_drag = mediamatic_translate.move_1_file;

		$("body").append('<div id="themedo-mediamatic-attachment" data-id="">' + text_drag + '</div>');

		var drag_item = $("#themedo-mediamatic-attachment");

		wp.media.view.Attachment.Library = Attachment.extend({

			initialize: function () {

				Attachment.prototype.initialize.apply(this, arguments);

				this.on("ready", function () {

					$(this.el)
						.drag("start", function () {

							var selected_files = $('.attachments li.selected');

							if (selected_files.length > 0) {

								text_drag = mediamatic_translate.Move + ' ' + selected_files.length + ' ' + mediamatic_translate.files;

							}
						
							drag_item.html(text_drag);
							$('body').addClass('themedo-draging');
							drag_item.show();
							
						})
						.drag("end", function () {
						
//							var toolbar_selector = ".wp-admin.upload-php .media-toolbar.wp-filter .media-toolbar-secondary";
//							if (!$(toolbar_selector + " .media-button.delete-selected-button").hasClass("hidden")) {
//							  $(toolbar_selector + " .media-button.select-mode-toggle-button").trigger("click");
//							}
						
							drag_item.hide();
							$('body').removeClass('themedo-draging');
							text_drag = mediamatic_translate.move_1_file;	
						
						})
						.drag(function (ev, dd) {

							var id = $(this).data("id");

							drag_item.data("id", id);

							drag_item.css({
								"top": ev.clientY - 15,
								"left": ev.clientX - 15,
							});

						});

				});
			}
		});



		$("#wpcontent").on("drop", ".jstree-anchor", function (event) {

			var des_folder_id = $(this).parent().attr('data-id');

			var ids = themedo_get_seleted_files();

			if (ids.length) {

				themedo_move_multi_attachments(ids, des_folder_id, event);

			} else {

				themedo_move_1_attachment(event, des_folder_id);
			}


		});//#wpcontent


		function themedo_get_seleted_files() {

			var selected_files = $('.attachments li.selected');

			var ids = [];

			if (selected_files.length) {

				selected_files.each(function (index, item) {

					ids.push($(item).data("id"));

				});

				return ids;

			}

			return false;

		}//themedo_get_seleted_files

		function themedo_move_multi_attachments(ids, des_folder_id, event) {

			$(event.target).addClass("need-refresh");

			var data = {};

			data.ids = ids;

			data.folder_id = des_folder_id;

			data.action = 'mediamaticSaveMultiAttachments';
			mediamaticWMC.mediamatic_begin_loading();
			jQuery.ajax({
				type: "POST",
				dataType: 'json',
				data: data,
				url: ajaxurl,
				success: function (res) {
					if (res.success) {

						res.data.forEach(function (item) {
							mediamaticWMC.updateCount(item.from, item.to);
							$('ul.attachments li[data-id="' + item.id + '"]').hide()
						});
						$('.jstree-anchor').addClass("need-refresh");

					}

					mediamaticWMC.mediamatic_finish_loading();
					
					
					// disable bulk select
					var toolbar_selector = ".wp-admin.upload-php .media-toolbar.wp-filter .media-toolbar-secondary";
					if (!$(toolbar_selector + " .media-button.delete-selected-button").hasClass("hidden")) {
					  $(toolbar_selector + " .media-button.select-mode-toggle-button").trigger("click");
					}

				}
			});// ajax 2



		}//themedo_move_multi_attachments

		function themedo_move_1_attachment(event, des_folder_id) {

			var attachment_id = drag_item.data("id");

			var attachment_item = $('.attachment[data-id="' + attachment_id + '"]');



			var current_folder = $(".wpmediacategory-filter").val();

			if (des_folder_id === 'all' || des_folder_id == current_folder)
				return;

			mediamaticWMC.mediamatic_begin_loading();

			jQuery.ajax({
				type: "POST",
				dataType: 'json',
				data: { id: attachment_id, action: 'mediamaticGetTermsByAttachment', nonce: mediamaticConfig2.nonce },
				url: ajaxurl,
				success: function (resp) {
					if (!$.trim(resp.data)) {
						//console.log("mediamatic no data found");
						mediamaticWMC.mediamatic_finish_loading();
					}
					else {
						// get terms of attachment
						var terms = Array.from(resp.data, v => v.term_id);
						//check if drag to owner folder

						if (terms.includes(Number(des_folder_id))) {

							mediamaticWMC.mediamatic_finish_loading();

							return;
						}

						$(event.target).addClass("need-refresh");

						var data = {};

						data.id = attachment_id;

						data.attachments = {};

						data.attachments[attachment_id] = { menu_order: 0 };

						data.folder_id = des_folder_id;

						data.action = 'mediamaticSaveAttachment';

						jQuery.ajax({
							type: "POST",
							dataType: 'json',
							data: data,
							url: ajaxurl,
							success: function (res) {

								if (res.success) {

									$.each(terms, function (index, value) {

										mediamaticWMC.updateCount(value, des_folder_id);
									});
									//console.log(current_folder, terms.length);
									//if attachment not in any terms (folder)
									if (current_folder === 'all' && !terms.length) {

										mediamaticWMC.updateCount(-1, des_folder_id);
									}

									if (current_folder == -1) {

										mediamaticWMC.updateCount(-1, des_folder_id);
									}

									if (current_folder != 'all') {

										attachment_item.detach();
									}

								}

								mediamaticWMC.mediamatic_finish_loading();
								

							}
						});// ajax 2
					}
				}
			});//ajax 1
		} //themedo_move_1_attachment

		setTimeout(function () {
			var curr_folder = localStorage.getItem('current_folder') || 'all';
			$('#menu-item-' + curr_folder + ' .jstree-anchor').trigger('click');
		}, 1000);

		$('.menu-item-bar').on({

			mouseenter: function () {
				var $this = $(this);
				var parentWidth = $this.find('.item-title').innerWidth();
				var childWidth = $this.find('.menu-item-title').innerWidth();
				var title = $this.find('.menu-item-title').text();
				
				if (parentWidth < (childWidth + 10)) {

					$this.tooltip({
						title: title,
						placement: "bottom",
						
					});
					$this.tooltip('show');
				}
			},
			mouseleave: function () {
				var $this = $(this);
				$this.tooltip('hide');
			}

		});


	});//ready


	

})(jQuery);