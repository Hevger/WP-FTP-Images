var oldCurrentFolder = null;

var themedo_mediamatic_free 	= true;
var themedo_mediamatic_pro_link = 'http://mediamatic.frenify.com/1/';





(function ($){

	"use strict";
	
    var MediamaticCoreTree = {
		
		pluginUrl:		mediamaticConfig.pluginUrl,

        options: {
            menuItemDepthPerLevel: 30, // Do not use directly. Use depthToPx and pxToDepth instead.
            globalMaxDepth: 11,
            sortableItems: '> *',
            targetTolerance: 0
        },
		
        menuList: undefined,   // Set in init.
        menusChanged: false,
        isRTL: !!('undefined' != typeof isRtl && isRtl),
        negateIfRTL: ('undefined' != typeof isRtl && isRtl) ? -1 : 1,
        menus: { "moveUp": "Move up one", "moveDown": "Move down one", "moveToTop": "Move to the top", "moveUnder": "Move under %s", "moveOutFrom": "Move out from under %s", "under": "Under %s", "outFrom": "Out from under %s", "menuFocus": "%1$s. Menu item %2$d of %3$d.", "subMenuFocus": "%1$s. Sub item number %2$d under %3$s." },
        current_folder: localStorage.getItem('current_folder') || 'all',
        current_parent: null,
        old_parent: null,
        state: (localStorage.getItem("tree_state")) ? localStorage.getItem("tree_state").split(",") : [],

        // Functions that run on init.
        init: function () {
			
			$('.mediamatic_toolbar').remove();
			
            this.menuList = $('#folders-to-edit');
            this.jQueryExtensions();
            if (this.menuList.length) {
                this.initSortables();
            }
            this.setIcons();
            this.newBehavior();
            this.createActions();
            this.imgToSvg();
            this.addActionsContent();
            
        },
		
		createActions: function(){
			var html = '<div class="mediamatic_actions_content"><ul><li class="kaku"><span class="add_new">'+mediamatic_translate.new_folder+'</span></li><li><span class="rename">'+mediamatic_translate.rename+'</span></li><li><span class="delete">'+mediamatic_translate.delete+'</span></li></ul></div>';
			$('body').append(html);
		},
		
		addActionsContent: function(){
			
			var self = this;

			$('.menu-item .action_button').on('click', function(e){
				
				e.preventDefault();
				e.stopPropagation();
				
				var el 		= $(this);
                self.doSetCurrentFolder(el);
				
				var content = $('.mediamatic_actions_content');
				var li 		= el.parent();
				var id 		= li.data('id');
				var topP 	= li.offset().top - 38;
				var leftP 	= li.offset().left + li.width() + 55;
				
				content.addClass('active').attr('data-id', id);
				content.css({left:leftP, top:topP});
			});
			
			$(window).on('click', function(){
				$('.mediamatic_actions_content').removeClass('active').attr('data-id', '');		 
			});
			
			this.fireActions();
			
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
		},
		
        themedo_mediamatic_upgrade_options: function () {
            var options = {
                title: mediamatic_translate.notice,
                html: mediamatic_translate.limit_folder,
                type: "warning",
                showCancelButton: true,
                confirmButtonText: mediamatic_translate.ok,
                cancelButtonText: mediamatic_translate.no_thank,
                confirmButtonClass: 'bnt-upgrade',
                cancelButtonClass: 'btn-text',

            };
            return options;

        },
        setIcons: function () {
			var self 	= this;
            var lis 	= self.menuList.find('li.menu-item');

            $.each(lis, function (index, el) {
                var depth = $(el).menuItemDepth();

                var next_li = $(el).next();
                if (next_li.hasClass('menu-item')) {
                    var depth_next = next_li.menuItemDepth();

                    if (depth_next > depth) {

                        if (self.state.indexOf($(el).data('id').toString()) < 0) {

                            var children = $(el).childMenuItems();

                            children.wrapAll('<li class="new-wrapper children_of_' + $(el).attr('id') + '"><ul></ul></li>');

                            $(el).find('.sub_opener').addClass('has_children').addClass('close');

                        } else {
                            $(el).find('.sub_opener').addClass('has_children').addClass('open');
                        }

                    }
                }
            });


            $(document).on('click', '.sub_opener.has_children', function (event) {
				
                event.preventDefault();
                var $this 		= $(this);
                var li 			= $this.closest('li.menu-item');
                var li_id 		= li.data('id');
				var children;
                if ($this.hasClass('open')) {
                    children 	= li.childMenuItems();

                    children.wrapAll('<li class="new-wrapper children_of_' + li.attr('id') + '"><ul></ul></li>');
                    $this.removeClass('open').addClass('close');


                    self.state.splice(self.state.indexOf(li_id.toString()), 1);
                    localStorage.setItem("tree_state", self.state);

                } else if ($this.hasClass('close')) {
                    children 	= $('.children_of_' + li.attr('id') + ' >ul>li.menu-item');

                    children.unwrap().unwrap();
                    $this.removeClass('close').addClass('open');
                    if (self.state.indexOf(li_id.toString()) < 0) {
                        self.state.push(li_id);
                        localStorage.setItem("tree_state", self.state);
                    }


                }
                oldCurrentFolder = localStorage.getItem("current_folder");
                localStorage.setItem("current_folder", li_id);
                li.find('.jstree-anchor').trigger('click');

            });
        },
		
		fireActions: function(){
			var self = this;
			
			// add new
			$('.mediamatic_actions_content span.add_new').on('click', function(){
				
				// light version limitation
                if ($('#folders-to-edit li').length >= 12 && themedo_mediamatic_free) {

                    self.limitationPopup();
                    return false;
                }
				// light version limitation
				
              	self.doInsertFolder();
			});
			
			// rename
			$('.mediamatic_actions_content span.rename').on('click', function(){
				
				var input;
				
				if ($('.folder-input').length) {
					$('.folder-input').focus();
					input = $('.folder-input');
					input.putCursorAtEnd().on("focus", function () { // could be on any event
						input.putCursorAtEnd();
					});
					return;
				}

				var li 			= $('.menu-item.current_folder');
				var e_id 		= li.find('.menu-item-data-db-id').val();
				var folder_name = li.find('.menu-item-title').text();
				var depth 		= li.menuItemDepth();
				var html 		= self.editFolderFormTemplate(e_id, folder_name, 'menu-item-depth-' + depth);

				$(html).insertAfter(li);
				self.imgToSvg();
				self.editFolderCancel();
				self.editFolderConfirm();
				
				input = $('.edit-folder-name');
				input.putCursorAtEnd().on("focus", function () { // could be on any event
					input.putCursorAtEnd();
				});

				li.hide();
			});
			
			// delete
			$('.mediamatic_actions_content span.delete').on('click', function(){
				
				var li 		= $('.menu-item.current_folder');
				var e_id 	= li.find('.menu-item-data-db-id').val();

				if ($(li).next().find(".menu-item-data-parent-id").length && $(li).next().find(".menu-item-data-parent-id").val() == e_id) 
				{
					self.deleteFolderOops();
				} 
				else 
				{	
					self.deleteFolderConfirm(e_id);
				}
				
			});
			
			
		},
		
		
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
		
		errorPopup: function(){
			
			var html = '<div id="mediamatic_be_confirm">';
					html += '<div class="confirm_inner">';
						html += '<div class="desc_holder">';
							html += '<h3>' + mediamatic_translate.error + '</h3>';
							html += '<p>' + mediamatic_translate.error_occurred + '</p>';
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
		},
		
		
		limitationPopup: function(){

			var html = '<div id="mediamatic_be_confirm">';
					html += '<div class="confirm_inner">';
						html += '<div class="desc_holder">';
							html += '<h3>' + mediamatic_translate.limit_folder_title + '</h3>';
							html += '<p>' + mediamatic_translate.limit_folder_content + '</p>';
						html += '</div>';
						html += '<div class="links_holder">';
							html += '<a class="yes green" href="#">' + mediamatic_translate.upgrade + '</a>';
							html += '<a class="no" href="#">' + mediamatic_translate.no_thanks + '</a>';
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
				window.open(themedo_mediamatic_pro_link, '_blank');
				$('#mediamatic_be_confirm').remove();
				return false;
			});
			cancelActionBtn.on('click', function () {
				confirm.removeClass();
				
				$('#mediamatic_be_confirm').remove();
				return false;
			});
		},
		
		
        newBehavior: function () {
			var self = this;
            $(document).on('click', '.menu-item-bar', function (event) {
                event.preventDefault();
                var $this = $(this);
                self.doSetCurrentFolder($this);
            });
			

            $(document).on('keypress', '.edit-folder-name', function (event) {

                if (event.which == 13) {

                    event.preventDefault();

                    $('.edit-folder-now').trigger('click');

                }


            });

            $(document).on('keypress', '.add-new-folder-name', function (event) {

                if (event.which == 13) {

                    event.preventDefault();

                    $('.add-new-folder-now').trigger('click');

                }


            });



            $(document).on('click', '.add-new-folder-now', function (event) {
                event.preventDefault();
                
				// light version limitation
                if ($('#folders-to-edit li').length >= 12 && themedo_mediamatic_free) {

                    self.limitationPopup();
                    return false;
                }
				// light version limitation
				
                var $this = $(this);
                var name = $('.add-new-folder-name').val();
                if (name == '') {
                    alert(mediamatic_translate.folder_name_enter);
                } else {
                    var parent = 0;
                    var depth = 0;

                    var parent_e = $('#menu-item-' + parent);
                    var parent_depth = 0;
                    if (self.current_folder != null) {
                        parent 			= self.current_folder;
                        //find depth
                        parent_e 		= $('#menu-item-' + parent);
                        depth 			= parent_e.menuItemDepth()
                        parent_depth 	= depth;
                        depth 			= parseInt(depth) + 1;
                        //end finding depth
                    }

                    mediamaticWMC.mediamatic_begin_loading();

                    var data = {
                        'action': 'mediamatic_ajax_update_folder_list',
                        'new_name': name,
                        'parent': parent,
                        'folder_type': 'default',
                        'type': 'new'
                    };


                    $.post(ajaxurl, data, function (response) {
                        if (response == 'error') {
                            self.errorPopup();
                        }
						
                    }).fail(function () {
                        self.errorPopup();
						
                    }).success(function (response) {

                        var new_folder_html = self.newFolderTemplate(response.data.term_id, response.data.term_name, parent, depth);
                        $('.new-folder-wrap').remove();
                        if (self.current_folder == null) {
                            $('#folders-to-edit').append(new_folder_html);
							self.imgToSvg();
							self.addActionsContent();
                        } else {
                            //insert to the last child
                            var e = $('[class="menu-item-data-parent-id"][value="' + self.current_folder + '"]');
                            if (e.length == 0) {
                                $(new_folder_html).insertAfter($('#menu-item-' + self.current_folder));
                                $('#menu-item-' + self.current_folder).find('.sub_opener').addClass('has_children open');
								self.imgToSvg();
								self.addActionsContent();
                            } else {
                                var li = $('#menu-item-' + self.current_folder);
                                var all_after_li = li.nextAll();
                                $.each(all_after_li, function (index, el) {
                                    var _depth = $(el).menuItemDepth();
                                    if (_depth <= parent_depth) {
                                        $(new_folder_html).insertAfter($(el).prev());
										self.imgToSvg();
										self.addActionsContent();
                                        return false;
                                    } else if (index == (all_after_li.length - 1)) {
                                        $(new_folder_html).insertAfter($(el));
										self.imgToSvg();
										self.addActionsContent();
                                    }
                                });

                            }
                        }

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
                        if (parent && self.state.indexOf(parent.toString()) < 0) {
                            self.state.push(parent);
                            localStorage.setItem("tree_state", self.state);
                        }


                        mediamaticWMC.mediamatic_finish_loading();
                    });


                }
            });
			
            $(document).on('click', '.add-new-folder-cancel', function (event) {
                event.preventDefault();
                $('.new-folder-wrap').remove();
            });
			
            $('.new-folder').on('click', function () {
 				
				// light version limitation
                if ($('#folders-to-edit li').length >= 12 && themedo_mediamatic_free) {

                    self.limitationPopup();
                    return false;
                }
				// light version limitation

                self.doInsertFolder();
            });
			
            $(document).on('click', '#themedo-mediamatic-defaultTree .jstree-anchor', function (event) {
                event.preventDefault();
                self.doSetCurrentFolder();
            });

            $('#themedo-mediamatic-folderTree .jstree-anchor').dblclick(function (e) {
                e.preventDefault();
                setTimeout(function () {
                    $('.js_mediamatic_rename').trigger('click');
                }, 100);
            });
            $('.js_mediamatic_rename').on('click', function () {
				
				var input = '';
				
                if ($('.folder-input').length) {
                    $('.folder-input').focus();
                    input = $('.folder-input');
                    input.putCursorAtEnd().on("focus", function () { // could be on any event
                        input.putCursorAtEnd();
                    });
                    return false;
                }

                var li = $('.menu-item.current_folder');
                if (li.length) 
				{
                    var e_id = li.find('.menu-item-data-db-id').val();
                    var folder_name = li.find('.menu-item-title').text();
                    var depth = li.menuItemDepth();
                    var html = self.editFolderFormTemplate(e_id, folder_name, 'menu-item-depth-' + depth);
                    $(html).insertAfter(li);
					self.imgToSvg();
					self.editFolderCancel();
					self.editFolderConfirm();
					
                    li.hide();
                    $('.edit-folder-name').focus();

                    input = $('.edit-folder-name');
                    input.putCursorAtEnd().on("focus", function () { // could be on any event
                        input.putCursorAtEnd();
                    });
                }

            });
        },
        doSetCurrentFolder: function ($element) {
			var self = this;
            if ($element == null) {
                self.menuList.find('li.menu-item').removeClass('current_folder');
                self.current_folder = null;
            } else {
                self.menuList.find('li.menu-item').removeClass('current_folder');
                $element.closest('.menu-item').addClass('current_folder');
                $('.jstree-anchor.jstree-clicked').removeClass('jstree-clicked');
                $('.jstree-node.current-dir').removeClass('current-dir');

                self.current_folder = $element.closest('.menu-item').find('.menu-item-data-db-id').val();

                localStorage.setItem('current_folder', self.current_folder);

            }

        },

        doRefreshFolder: function (folder_id) {
            if ($.trim(folder_id)) {
                var data = {
                    'action': 'mediamaticAjaxRefreshFolder',
                    'current_folder': folder_id
                };
                mediamaticWMC.mediamatic_begin_loading();
                $.post(ajaxurl, data, function () {
                }).success(function (response) {
                    if (response.success != true) {
                        console.log('Error: ' + response);
                        return;
                    }
                    var selector = $('#menu-item-' + folder_id);
                    if ($(selector).length) {
                        var current_number = $(selector).data("number");
                        var rowChanged = response.data.rowChanged;
                        if (current_number >= rowChanged){
                            $(selector).attr("data-number", current_number - rowChanged);
						}
                    }
                    mediamaticWMC.mediamatic_finish_loading();
                });
            }
        },

        doInsertFolder: function () {
			
			var self = this;
			
            if ($('.folder-input').length) {
                $('.folder-input').focus();
                var input = $('.folder-input');
                input.putCursorAtEnd().on("focus", function () { // could be on any event
                    input.putCursorAtEnd();
                });
                return false;
            }

            if (!$('#menu-item-' + self.current_folder).length) {
                self.current_folder = null;
                localStorage.removeItem('current_folder');

            }


           
            if (self.current_folder == null) {
                $('#folders-to-edit').append(self.newFolderFormTemplate());
				self.imgToSvg();
            } else {

                //find depth
                var parent_e = $('#menu-item-' + self.current_folder);
                var depth = parent_e.menuItemDepth()
                var parent_depth = depth;
                depth = parseInt(depth) + 1;
                //end finding depth
                if (depth >= (self.options.globalMaxDepth + 1)) {
                    alert('The max Depth is: ' + self.options.globalMaxDepth);
                } else {
                    //open folder if it was closed
                    var icon = $('#menu-item-' + self.current_folder).find('.sub_opener');
                    if (icon.hasClass('close')) {
                        icon.trigger('click');
                    }
                    //insert to the last child
                    var e = $('[class="menu-item-data-parent-id"][value="' + self.current_folder + '"]');
                    if (e.length == 0) {

                        $(self.newFolderFormTemplate('menu-item-depth-' + depth)).insertAfter($('#menu-item-' + self.current_folder));
						self.imgToSvg();
						
                    } else {
                        var li = $('#menu-item-' + self.current_folder);

                        var all_after_li = li.nextAll();
                        $.each(all_after_li, function (index, el) {
                            var _depth = $(el).menuItemDepth()

                            if (_depth <= parent_depth) {

                                $(self.newFolderFormTemplate('menu-item-depth-' + depth)).insertAfter($(el).prev());
								self.imgToSvg();
                                return false;
                            } else if (index == (all_after_li.length - 1)) {
                                $(self.newFolderFormTemplate('menu-item-depth-' + depth)).insertAfter($(el));
								self.imgToSvg();
                                return false;
                            }
                        });

                    }


                }
            }
            $('.add-new-folder-name').focus();
			
        },
		
        newFolderFormTemplate: function (extra_class) {
			var self = this;
            if (typeof extra_class == 'undefined') {
                extra_class = '';
            }
            
			return '<li class="new-folder-wrap mediamatic_new_and_edit ' + extra_class + '"><div class="input_holder"><img src="'+self.pluginUrl+'/assets/img/folder.svg" class="mediamatic_be_svg" /><input type="text" name="add-new-folder-name" value="" class="folder-input add-new-folder-name" id="" autocomplete="off" /></div><div class="action_buttons"><span class="add-new-folder-now mf_confirm"><img src="'+self.pluginUrl+'/assets/img/check.svg" class="mediamatic_be_svg" /></span><span class="add-new-folder-cancel mf_cancel"><img src="'+self.pluginUrl+'/assets/img/cancel.svg" class="mediamatic_be_svg" /></span></div></li>';

        },
        editFolderFormTemplate: function (id, val, extra_class) {
			var self = this;
            if (typeof extra_class == 'undefined') {
                extra_class = '';
            }
            if (typeof val == 'undefined') {
                val = '';
            }

			return '<li data-id="' + id + '" class="edit-folder-wrap mediamatic_new_and_edit ' + extra_class + '"><div class="input_holder"><img src="'+self.pluginUrl+'/assets/img/folder.svg" class="mediamatic_be_svg" /><input type="text" name="edit-folder-name" value="' + val + '" class="folder-input edit-folder-name" id="" autocomplete="off" /></div><div class="action_buttons"><span class="edit-folder-now mf_confirm"><img src="'+self.pluginUrl+'/assets/img/check.svg" class="mediamatic_be_svg" /></span><span class="edit-folder-cancel mf_cancel" ><img src="'+self.pluginUrl+'/assets/img/cancel.svg" class="mediamatic_be_svg" /></span></div></li>';
        },
		
		editFolderCancel:function(){

			$('.edit-folder-cancel.mf_cancel').on('click', function(e){
				e.preventDefault();
				var el = $(this);
				$('#menu-item-' + el.closest('.edit-folder-wrap').data('id')).show();
				$('.edit-folder-wrap').remove();
			});
			
			
		},
		
		editFolderConfirm: function(){
			
			$('.edit-folder-now.mf_confirm').on('click', function(){
				
				var el 			= $(this);
				var new_name 	= $('.edit-folder-name').val();
				
				if (new_name == '') {
					alert(mediamatic_translate.folder_name_enter);
					return false;
				} else {
					var id = el.closest('.edit-folder-wrap').data('id');
					var li = $('#menu-item-' + id);
					li.find('.menu-item-title').text(new_name);
					li.show();
					$('.edit-folder-wrap').remove();
					themedo_trigger_folder.rename(id, new_name);
					$.event.trigger({
						type: 'MediamaticCoreTree_renamed',
						id: id,
						new_name: new_name
					});
				}
			});
			
			
		},
		
        newFolderTemplate: function (id, name, parent, depth) {
			var self = this;
            return '<li id="menu-item-' + id + '" data-id= "' + id + '" class="menu-item menu-item-depth-' + depth + '">' +
                '<span class="sub_opener"><span></span></span>' +
                '<div class="menu-item-bar jstree-anchor">' +
                '<div class="menu-item-handle ui-sortable-handle">' +
				'<img src="'+self.pluginUrl+'/assets/img/folder.svg" class="mediamatic_be_svg" />'+
                '<span class="item-title"><span class="menu-item-title">' + name + '</span>' +
                '</span></div>' +
                '</div>' +
				'<span class="action_button"><span class="a1"></span><span class="a2"></span><span class="a3"></span></span>'+
                '<ul class="menu-item-transport"></ul>' +
                '<input class="menu-item-data-db-id" type="hidden" name="menu-item-db-id[' + id + ']" value="' + id + '">' +
                '<input class="menu-item-data-parent-id" type="hidden" name="menu-item-parent-id[' + id + ']" value="' + parent + '">' +
                '</li>';
        },
        jQueryExtensions: function () {
			
			var self = this;
            // jQuery extensions
            $.fn.extend({
                menuItemDepth: function () {
                    var margin = self.isRTL ? this.eq(0).css('margin-right') : this.eq(0).css('margin-left');
                    return self.pxToDepth(margin && -1 != margin.indexOf('px') ? margin.slice(0, -2) : 0);
                },
                updateDepthClass: function (current, prev) {
                    return this.each(function () {
                        var t = $(this);
                        prev = prev || t.menuItemDepth();
                        $(this).removeClass('menu-item-depth-' + prev)
                            .addClass('menu-item-depth-' + current);
                    });
                },
                shiftDepthClass: function (change) {
                    return this.each(function () {
                        var t = $(this),
                            depth = t.menuItemDepth(),
                            newDepth = depth + change;

                        t.removeClass('menu-item-depth-' + depth)
                            .addClass('menu-item-depth-' + (newDepth));

                        if (0 === newDepth) {
                            t.find('.is-submenu').hide();
                        }
                    });
                },
                childMenuItems_bk: function () {
                    var result = $();
                    this.each(function () {
                        var t = $(this), depth = t.menuItemDepth(), next = t.next('.menu-item');
                        while (next.length && next.menuItemDepth() > depth) {
                            result = result.add(next);
                            next = next.next('.menu-item');
                        }
                    });
                    return result;
                },
                childMenuItems: function () {
                    var result = $();
                    this.each(function () {
                        var t = $(this), depth = t.menuItemDepth(), next = t.next('li');
                        while (next.length && next.menuItemDepth() > depth || next.hasClass('new-wrapper')) {
                            
                            result = result.add(next);

                            next = next.next('li');
                        }
                    });
                    return result;
                },
                updateParentMenuItemDBId: function () {
                    return this.each(function () {
                        var item = $(this),
                            input = item.find('.menu-item-data-parent-id'),
                            depth = parseInt(item.menuItemDepth(), 10),
                            parentDepth = depth - 1,
                            parent = item.prevAll('.menu-item-depth-' + parentDepth).first();
                        var new_parent = 0;
                        if (0 !== depth) {
                            new_parent = parent.find('.menu-item-data-db-id').val();
                        }
                        input.val(new_parent);
                        if (new_parent != self.current_parent) {
                            $.event.trigger({
                                type: 'MediamaticCoreTree_parent_changed',
                                new_parent: new_parent,
                                id: item.find('.menu-item-data-db-id').val(),
                            })
                            //console.log('parent changed');
                            self.state.push(new_parent);
                            localStorage.setItem("tree_state", self.state);
                        }
                        self.current_parent = null;
                    });
                },
                putCursorAtEnd: function () {

                    return this.each(function () {

                        // Cache references
                        var $el = $(this),
                            el = this;

                        // Only focus if input isn't already
                        if (!$el.is(":focus")) {
                            $el.focus();
                        }

                        // If this function exists... (IE 9+)
                        if (el.setSelectionRange) {

                            // Double the length because Opera is inconsistent about whether a carriage return is one character or two.
                            var len = $el.val().length * 2;

                            // Timeout seems to be required for Blink
                            setTimeout(function () {
                                el.setSelectionRange(len, len);
                            }, 1);

                        } else {

                            // As a fallback, replace the contents with itself
                            // Doesn't work in Chrome, but Chrome supports setSelectionRange
                            $el.val($el.val());

                        }

                        // Scroll to the bottom, in case we're in a tall textarea
                        // (Necessary for Firefox and Chrome)
                        this.scrollTop = 999999;

                    });

                }
            });
        },
        initSortables: function () {
			
			var self = this;
            var currentDepth = 0, originalDepth, minDepth, maxDepth,
                prev, next, prevBottom, nextThreshold, helperHeight, transport,
                menuEdge = self.menuList.offset().left,
                body = $('body'), maxChildDepth,
                menuMaxDepth = initialMenuMaxDepth();

            if (0 !== $('#folders-to-edit li').length)
                $('.drag-instructions').show();

            // Use the right edge if RTL.
            menuEdge += self.isRTL ? self.menuList.width() : 0;

            self.menuList.sortable({
                handle: '.menu-item-handle',
                placeholder: 'sortable-placeholder',
                items: self.options.sortableItems,
                start: function (e, ui) {
                    var height, width, parent, children, tempHolder;

                    // handle placement for rtl orientation
                    if (self.isRTL)
                        ui.item[0].style.right = 'auto';

                    transport = ui.item.children('.menu-item-transport');

                    // Set depths. currentDepth must be set before children are located.
                    originalDepth = ui.item.menuItemDepth();
                    updateCurrentDepth(ui, originalDepth);

                    // Attach child elements to parent
                    // Skip the placeholder
                    parent = (ui.item.next()[0] == ui.placeholder[0]) ? ui.item.next() : ui.item;
                    children = parent.childMenuItems();
                    if (true) { }
                    transport.append(children);

                    // Update the height of the placeholder to match the moving item.
                    height = transport.outerHeight();
                    // If there are children, account for distance between top of children and parent
                    height += (height > 0) ? (ui.placeholder.css('margin-top').slice(0, -2) * 1) : 0;
                    height += ui.helper.outerHeight();
                    helperHeight = height;
                    height -= 2; // Subtract 2 for borders
                    ui.placeholder.height(height);

                    // Update the width of the placeholder to match the moving item.
                    maxChildDepth = originalDepth;
                    children.each(function () {
                        var depth = $(this).menuItemDepth();
                        maxChildDepth = (depth > maxChildDepth) ? depth : maxChildDepth;
                    });
                    width = ui.helper.find('.menu-item-handle').outerWidth(); // Get original width
                    width += self.depthToPx(maxChildDepth - originalDepth); // Account for children
                    width -= 2; // Subtract 2 for borders
                    ui.placeholder.width(width);

                    // Update the list of menu items.
                    tempHolder = ui.placeholder.next('.menu-item');
                    tempHolder.css('margin-top', helperHeight + 'px'); // Set the margin to absorb the placeholder
                    ui.placeholder.detach(); // detach or jQuery UI will think the placeholder is a menu item
                    $(this).sortable('refresh'); // The children aren't sortable. We should let jQ UI know.
                    ui.item.after(ui.placeholder); // reattach the placeholder.
                    tempHolder.css('margin-top', 0); // reset the margin

                    // Now that the element is complete, we can update...
                    updateSharedVars(ui);
                    self.current_parent = ui.item.find('.menu-item-data-parent-id').val()

                    self.old_parent = ui.item.prev();
                },
                stop: function (e, ui) {
                    var children, subMenuTitle,
                        depthChange = currentDepth - originalDepth;

                    // Return child elements to the list
                    if ($('.children_of_' + ui.item.attr('id')).length) {
                        $('.children_of_' + ui.item.attr('id')).insertAfter(ui.item);
                    } else {
                        children = transport.children().insertAfter(ui.item);
                    }
                    $.each($('.new-wrapper'), function (index, el) {
                        $(el).insertAfter('#menu-item-' + $(el).attr('class').match(/children_of_menu-item-(\d)+/)[1]);
                    });
                    // Add "sub menu" description
                    subMenuTitle = ui.item.find('.item-title .is-submenu');
                    if (0 < currentDepth)
                        subMenuTitle.show();
                    else
                        subMenuTitle.hide();

                    // Update depth classes
                    if (0 !== depthChange) {
                        ui.item.updateDepthClass(currentDepth);

                        if ($('.children_of_' + ui.item.attr('id')).length) {
                            children = $('.children_of_' + ui.item.attr('id')).find('.menu-item');
                            children.shiftDepthClass(depthChange);
                        } else {
                            children.shiftDepthClass(depthChange);
                        }
                        updateMenuMaxDepth(depthChange);
                    }

                    // Register a change
                    self.registerChange();
                    // Update the item data.
                    ui.item.updateParentMenuItemDBId();

                    // address sortable's incorrectly-calculated top in opera
                    ui.item[0].style.top = 0;

                    // handle drop placement for rtl orientation
                    if (self.isRTL) {
                        ui.item[0].style.left = 'auto';
                        ui.item[0].style.right = 0;
                    }

                    //finally, remove or add icon for old_parent
                    if (self.old_parent.childMenuItems().length == 0) {
                        self.old_parent.find('.sub_opener').removeClass('has_children open')
                    } else {
                        self.old_parent.find('.sub_opener').addClass('has_children open')
                    }
                    //remove or add icon for new_parent
                    var new_parent = $('#menu-item-' + ui.item.find('.menu-item-data-parent-id').val())
                    if (new_parent.childMenuItems().length > 0) {
                        new_parent.find('.sub_opener').addClass('has_children open');
                    }
                    if (new_parent.find('.sub_opener').hasClass('close')) {
                        new_parent.find('.sub_opener').trigger('click');
                    }
                    ui.item.move_folder();//chidang
                },
                change: function (e, ui) {
                    // Make sure the placeholder is inside the menu.
                    // Otherwise fix it, or we're in trouble.
                    if (!ui.placeholder.parent().hasClass('menu'))
                        (prev.length) ? prev.after(ui.placeholder) : self.menuList.prepend(ui.placeholder);

                    updateSharedVars(ui);

                },
                sort: function (e, ui) {
                    var offset = ui.helper.offset(),
                        edge = self.isRTL ? offset.left + ui.helper.width() : offset.left,
                        depth = self.negateIfRTL * self.pxToDepth(edge - menuEdge);

                    // Check and correct if depth is not within range.
                    // Also, if the dragged element is dragged upwards over
                    // an item, shift the placeholder to a child position.
                    if (depth > maxDepth || offset.top < (prevBottom - self.options.targetTolerance)) {
                        depth = maxDepth;
                    } else if (depth < minDepth) {
                        depth = minDepth;
                    }

                    if (depth != currentDepth)
                        updateCurrentDepth(ui, depth);

                    // If we overlap the next element, manually shift downwards
                    if (nextThreshold && offset.top + helperHeight > nextThreshold) {
                        next.after(ui.placeholder);
                        updateSharedVars(ui);
                        $(this).sortable('refreshPositions');
                    }
                }
            });

            function updateSharedVars(ui) {
                var depth;

                prev = ui.placeholder.prev('.menu-item');
                next = ui.placeholder.next('.menu-item');

                // Make sure we don't select the moving item.
                if (prev[0] == ui.item[0]) prev = prev.prev('.menu-item');
                if (next[0] == ui.item[0]) next = next.next('.menu-item');

                prevBottom = (prev.length) ? prev.offset().top + prev.height() : 0;
                nextThreshold = (next.length) ? next.offset().top + next.height() / 3 : 0;
                minDepth = (next.length) ? next.menuItemDepth() : 0;

                if (prev.length)
                    maxDepth = ((depth = prev.menuItemDepth() + 1) > self.options.globalMaxDepth) ? self.options.globalMaxDepth : depth;
                else
                    maxDepth = 0;
            }

            function updateCurrentDepth(ui, depth) {
                ui.placeholder.updateDepthClass(depth, currentDepth);
                currentDepth = depth;
            }

            function initialMenuMaxDepth() {
                if (!body[0].className) return 0;
                var match = body[0].className.match(/menu-max-depth-(\d+)/);
                return match && match[1] ? parseInt(match[1], 10) : 0;
            }

            function updateMenuMaxDepth(depthChange) {
                var depth, newDepth = menuMaxDepth;
                if (depthChange === 0) {
                    return;
                } else if (depthChange > 0) {
                    depth = maxChildDepth + depthChange;
                    if (depth > menuMaxDepth)
                        newDepth = depth;
                } else if (depthChange < 0 && maxChildDepth == menuMaxDepth) {
                    while (!$('.menu-item-depth-' + newDepth, self.menuList).length && newDepth > 0)
                        newDepth--;
                }
                // Update the depth class.
                body.removeClass('menu-max-depth-' + menuMaxDepth).addClass('menu-max-depth-' + newDepth);
                menuMaxDepth = newDepth;
            }
        },

        registerChange: function () {
            this.menusChanged = true;
        },

        depthToPx: function (depth) {
            return depth * this.options.menuItemDepthPerLevel;
        },

        pxToDepth: function (px) {
            return Math.floor(px / this.options.menuItemDepthPerLevel);
        }

    };
	
	$(document).ready(function(){MediamaticCoreTree.init();});

})(jQuery);
