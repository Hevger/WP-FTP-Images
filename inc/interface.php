<?php

class Mediamatic_Interface
{


	private $version;
	private $mediamatic_free = true;

	public function __construct()
	{

		add_filter('restrict_manage_posts', array($this, 'restrictManagePosts'));
		add_filter('posts_clauses', array($this, 'postsClauses'), 10, 2);

		add_action('admin_enqueue_scripts', array($this, 'enqueue_styles'));
		add_action('admin_enqueue_scripts', array($this, 'enqueue_scripts'));
		add_action('load-upload.php', array($this, 'scripts_for_media_upload'));
		add_action('init', array($this, 'mediamaticAddFolderToAttachments'));
		add_action('admin_footer-upload.php', array($this, 'mediamaticInitMediaManager'));
		add_action('wp_ajax_mediamatic_ajax_update_folder_list', array($this, 'mediamaticAjaxUpdateFolderListCallback'));
		add_action('wp_ajax_mediamatic_ajax_delete_folder_list', array($this, 'mediamaticAjaxDeleteFolderListCallback'));
		add_action('wp_ajax_mediamatic_ajax_update_folder_position', array($this, 'mediamaticAjaxUpdateFolderPositionCallback'));
		add_action('wp_ajax_mediamatic_ajax_get_child_folders', array($this, 'mediamaticAjaxGetChildFoldersCallback'));
		add_action('wp_ajax_mediamaticAjaxSaveSplitter', array($this, 'mediamaticAjaxSaveSplitter'));
		add_filter('pre-upload-ui', array($this, 'mediamaticPreUploadInterface'));


		//Support Elementor
		if (defined('ELEMENTOR_VERSION')) {
			add_action('elementor/editor/after_enqueue_scripts', [$this, 'mediamaticEnqueueMediaAction']);
		}
	}

	public function mediamaticEnqueueMediaAction()
	{

		$suffix  = (defined('SCRIPT_DEBUG') && SCRIPT_DEBUG) ? '' : '';

		$taxonomy = MEDIAMATIC_FOLDER;
		$taxonomy = apply_filters('mediamatic_taxonomy', $taxonomy);


		$dropdown_options = array(
			'taxonomy'        => $taxonomy,
			'hide_empty'      => false,
			'hierarchical'    => true,
			'orderby'         => 'name',
			'show_count'      => true,
			'walker'          => new Mediamatic_Walker_Category_Mediagridfilter(),
			'value'           => 'id',
			'echo'            => false
		);

		$attachment_terms 	= wp_dropdown_categories($dropdown_options);
		$attachment_terms 	= preg_replace(array("/<select([^>]*)>/", "/<\/select>/"), "", $attachment_terms);

		echo '<script type="text/javascript">';
		echo '/* <![CDATA[ */';
		echo 'var mediamatic_folder = "' . MEDIAMATIC_FOLDER . '";';
		echo 'var mediamatic_taxonomies = {"folder":{"list_title":"' . html_entity_decode(esc_html__('All categories', MEDIAMATIC_TEXT_DOMAIN), ENT_QUOTES, 'UTF-8') . '","term_list":[{"term_id":"-1","term_name":"' . esc_html__('Uncategorized', MEDIAMATIC_TEXT_DOMAIN) . '"},' . substr($attachment_terms, 2) . ']}};';
		echo '/* ]]> */';
		echo '</script>';

		wp_enqueue_script('mediamatic-admin-topbar', plugins_url('assets/js/mediamatic-admin-topbar' . $suffix . '.js', dirname(__FILE__)), array('media-views'), $this->plugin_version, true);
		wp_enqueue_style('mediamatic-admin', MEDIAMATIC_ASSETS_URL . 'css/admin.css', array(), $this->version, 'all');
	}


	public function postsClauses($clauses, $query)
	{
		global $wpdb;

		if (isset($_GET['themedo_mediamatic_folder'])) {
			$folder = sanitize_text_field($_GET['themedo_mediamatic_folder']);
			if (!empty($folder) != '') {
				$folder = (int) $folder;
				if ($folder > 0) {
					$clauses['where'] .= ' AND (' . $wpdb->prefix . 'term_relationships.term_taxonomy_id = ' . $folder . ')';
					$clauses['join'] .= ' LEFT JOIN ' . $wpdb->prefix . 'term_relationships ON (' . $wpdb->prefix . 'posts.ID = ' . $wpdb->prefix . 'term_relationships.object_id)';
				} else {
					//to improve performance: set default folder for files when add new
					$folders = get_terms(MEDIAMATIC_FOLDER, array(
						'hide_empty' => false
					));
					$folder_ids = array();
					foreach ($folders as $k => $folder) {
						$folder_ids[] = $folder->term_id;
					}

					$folder_ids = esc_sql($folder_ids);

					$files_have_folder_query = "SELECT `ID` FROM " . $wpdb->prefix . "posts LEFT JOIN " . $wpdb->prefix . "term_relationships ON (" . $wpdb->prefix . "posts.ID = " . $wpdb->prefix . "term_relationships.object_id) WHERE (" . $wpdb->prefix . "term_relationships.term_taxonomy_id IN (" . implode(', ', $folder_ids) . "))";
					$clauses['where'] .= " AND (" . $wpdb->prefix . "posts.ID NOT IN (" . $files_have_folder_query . "))";
				}
			}
		}

		return $clauses;
	}


	public function restrictManagePosts()
	{
		$scr 	= get_current_screen();
		if ($scr->base !== 'upload') {
			return;
		}
		echo '<select id="media-attachment-filters" class="wpmediacategory-filter attachment-filters" name="themedo_mediamatic_folder"></select>';
	}


	public function enqueue_styles()
	{
		wp_enqueue_style('mediamatic-admin', MEDIAMATIC_ASSETS_URL . 'css/admin.css', array(), $this->version, 'all');
	}



	public function enqueue_scripts()
	{
		wp_register_script('mediamatic-util', MEDIAMATIC_ASSETS_URL . 'js/mediamatic-util.js', array('jquery'), $this->version, false);
		wp_localize_script('mediamatic-util', 'mediamatic_translate', $this->get_strings());
		wp_enqueue_script('mediamatic-util');

		wp_enqueue_script('mediamatic-admin', MEDIAMATIC_ASSETS_URL . 'js/mediamatic-admin.js', array('jquery'), $this->version, false);
		wp_enqueue_script('mediamatic-upload-event', MEDIAMATIC_ASSETS_URL . 'js/hook-add-new-upload.js', array('jquery'), $this->version, false);
	}


	public function scripts_for_media_upload()
	{
		//Get mode
		$mode 	= get_user_option('media_library_mode', get_current_user_id()) ? get_user_option('media_library_mode', get_current_user_id()) : 'grid';
		$modes 	= array('grid', 'list');

		if (isset($_GET['mode']) && in_array($_GET['mode'], $modes)) {
			$mode = sanitize_text_field($_GET['mode']);
			update_user_option(get_current_user_id(), 'media_library_mode', $mode);
		}

		//Load Scripts And Styles for Media Upload		
		wp_enqueue_style('mCustomScrollbar', MEDIAMATIC_ASSETS_URL . 'css/scrollbar.css', array(), $this->version, 'all');
		wp_enqueue_style('jstree', MEDIAMATIC_ASSETS_URL . 'css/jstree.css', array(), $this->version, 'all');
		wp_enqueue_style('mediamatic-style', MEDIAMATIC_ASSETS_URL . 'css/style.css', array(), $this->version, 'all');


		// Javascript Codes
		// Libraries
		wp_enqueue_script('jstree', MEDIAMATIC_ASSETS_URL . 'js/library/jstree.js', array('jquery'), $this->version, false);
		wp_enqueue_script('resizable', MEDIAMATIC_ASSETS_URL . 'js/library/resizable.js', array('jquery'), $this->version, false);
		wp_enqueue_script('scrollbar', MEDIAMATIC_ASSETS_URL . 'js/library/scrollbar.js', array('jquery'), $this->version, false);
		wp_enqueue_script('mediamatic-drag', MEDIAMATIC_ASSETS_URL . 'js/library/drag.js', array('jquery'), $this->version, false);
		wp_enqueue_script('mediamatic-drop', MEDIAMATIC_ASSETS_URL . 'js/library/drop.js', array('jquery'), $this->version, false);
		wp_enqueue_script('bootstrap', MEDIAMATIC_ASSETS_URL . 'js/library/bootstrap.js', array('jquery'), $this->version, false);

		wp_enqueue_script('mediamatic-trigger', MEDIAMATIC_ASSETS_URL . 'js/trigger-folder.js', array('jquery'), $this->version, false);

		wp_localize_script(
			'mediamatic-trigger',
			'mediamaticConfig',
			array(
				'upload_url' 		=> admin_url('upload.php'),
			)
		);

		// Custom Scripts
		wp_enqueue_script('mediamatic-folder-in-content', MEDIAMATIC_ASSETS_URL . 'js/folder-in-content.js', array('jquery'), $this->version, false);


		wp_enqueue_script('mediamatic-upload', MEDIAMATIC_ASSETS_URL . 'js/mediamatic-upload.js', array('jquery'), $this->version, false);
		wp_enqueue_script('mediamatic-folder', MEDIAMATIC_ASSETS_URL . 'js/folder.js', array('jquery'), $this->version, false);

		wp_localize_script(
			'mediamatic-folder',
			'mediamaticConfig',
			array(
				'pluginUrl' 		=> MEDIAMATIC_URL,
				'upload_url' 		=> admin_url('upload.php'),
				'svgFolder' 		=> '<img src="' . MEDIAMATIC_URL . '/assets/img/folder.svg" class="mediamatic_be_svg" />',

			)
		);



		if ($mode === 'grid') {
			wp_enqueue_script('mediamatic-upload-library', MEDIAMATIC_ASSETS_URL . 'js/hook-library-upload.js', array('jquery'), $this->version, false);
			wp_enqueue_script('mediamatic-upload-grid', MEDIAMATIC_ASSETS_URL . 'js/mediamatic-upload-grid.js', array('jquery'), $this->version, false);

			wp_localize_script(
				'mediamatic-upload-library',
				'mediamaticConfig1',
				array(
					'nonce' 		=> wp_create_nonce('ajax-nonce')
				)
			);

			wp_localize_script(
				'mediamatic-upload-grid',
				'mediamaticConfig2',
				array(
					'nonce' 		=> wp_create_nonce('ajax-nonce')
				)
			);
		} else {
			wp_enqueue_script('mediamatic-upload-list', MEDIAMATIC_ASSETS_URL . 'js/mediamatic-upload-list.js', array('jquery'), $this->version, false);
			wp_localize_script(
				'mediamatic-upload-list',
				'mediamaticConfig3',
				array(
					'upload_url' 		=> admin_url('upload.php'),
					'current_folder' 	=> ((isset($_GET['themedo_mediamatic_folder'])) ? sanitize_text_field($_GET['themedo_mediamatic_folder']) : ''),
					'no_item_html' 		=> '<tr class="no-items"><td class="colspanchange" colspan="' . apply_filters('mediamatic_noitem_colspan', 6) . '">' . esc_html__('No media files found.', MEDIAMATIC_TEXT_DOMAIN) . '</td></tr>',
					'item' 				=> esc_html__('item', MEDIAMATIC_TEXT_DOMAIN),
					'items' 			=> esc_html__('items', MEDIAMATIC_TEXT_DOMAIN),
					'nonce' 			=> wp_create_nonce('ajax-nonce'),
				)
			);
		}
	}


	public function mediamaticConvertTreeToFlatArray($array)
	{
		$result = array();
		foreach ($array as $key => $row) {
			$item 			= new stdClass();
			$item->term_id	= $row->term_id;
			$item->name		= $row->name;
			$item->parent	= $row->parent;
			$item->count	= $row->count;
			$result[] 		= $item;

			if (count($row->children) > 0) {
				$result = array_merge($result, $this->mediamaticConvertTreeToFlatArray($row->children));
			}
		}

		return $result;
	}


	public function mediamaticInitMediaManager($hook)
	{
		$all_count 					= wp_count_posts('attachment')->inherit;
		$uncategory_count 			= Mediamatic_Topbar::get_uncategories_attachment();
		$tree 						= $this->mediamaticTermTreeArray(MEDIAMATIC_FOLDER, 0);
		$folders 					= $this->mediamaticConvertTreeToFlatArray($tree);
		$sidebar_width 	= get_option('mediamatic_sidebar_width', 300);
		?>
		<div id="mediamatic_sidebar" style="display: none;">

			<div class="mediamatic_sidebar panel-left" <?php echo ($sidebar_width ? ' style="width: ' . $sidebar_width . 'px;"' : '') ?>>
				<div class="mediamatic_sidebar_fixed" <?php echo ($sidebar_width ? ' style="width: ' . $sidebar_width . 'px;"' : '') ?>>

					<input type="hidden" id="mediamatic_terms">

					<div class="mediamatic_sidebar_header">
						<h1 class="mediamatic_main_title"><?php esc_html_e('Folders', 'mediamatic'); ?></h1>
						<a class="mediamatic_main_add_new js_mediamatic_tipped new-folder">
							<img src="<?php echo MEDIAMATIC_URL; ?>/assets/img/folder.svg" class="mediamatic_be_svg" />
							<?php esc_html_e('Add New', MEDIAMATIC_TEXT_DOMAIN); ?>
						</a>
					</div>



					<div class="mediamatic_toolbar">
						<button type="button" class="mediamatic_main_button_icon js_mediamatic_tipped js_mediamatic_rename button media-button" data-title="<?php esc_html_e('Rename', MEDIAMATIC_TEXT_DOMAIN); ?>">
							<svg class="a-s-fa-Ha-pa" x="0px" y="0px" width="24px" height="24px" viewBox="0 0 24 24" focusable="false" fill="#8f8f8f">
								<path d="M0 0h24v24H0z" fill="none"></path>
								<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM6 17v-2.47l7.88-7.88c.2-.2.51-.2.71 0l1.77 1.77c.2.2.2.51 0 .71L8.47 17H6zm12 0h-7.5l2-2H18v2z"></path>
							</svg>
							<span><?php esc_html_e('Rename', MEDIAMATIC_TEXT_DOMAIN); ?></span><span class="opacity0"><?php esc_html_e('Rename', MEDIAMATIC_TEXT_DOMAIN); ?></span></button>
						<button type="button" class="mediamatic_main_button_icon js_mediamatic_tipped js_mediamatic_delete button media-button"><svg width="24px" height="24px" viewBox="0 0 24 24" fill="#8f8f8f" focusable="false" class="">
								<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path>
								<path d="M0 0h24v24H0z" fill="none"></path>
							</svg><span><?php esc_html_e('Delete', MEDIAMATIC_TEXT_DOMAIN); ?></span><span class="opacity0"><?php esc_html_e('Delete', MEDIAMATIC_TEXT_DOMAIN); ?></span></button>

					</div>

					<div class="mediamatic_be_loader">
						<span class="loader_process">
							<span class="ball"></span>
							<span class="ball"></span>
							<span class="ball"></span>
						</span>
					</div>

					<div id="themedo-mediamatic-defaultTree" class="mediamatic_tree">
						<ul>
							<li id="menu-item-all" data-jstree='{"selected":true}' id="menu-item-all" data-id="all" data-number="<?php echo esc_attr($all_count); ?>" class="menu-item">
								<img src="<?php echo MEDIAMATIC_URL; ?>/assets/img/folder.svg" class="mediamatic_be_svg" />
								<span class="item-title title"><?php esc_html_e('All files', MEDIAMATIC_TEXT_DOMAIN); ?></span>
							</li>

							<?php
									$cat_count = $uncategory_count ? "data-number={$uncategory_count}" : '';
									?>

							<li id="menu-item--1" data-jstree='{"icon":"icon-archive"}' id="menu-item--1" data-id="-1" <?php echo esc_html($cat_count); ?> class="menu-item uncategory">
								<img src="<?php echo MEDIAMATIC_URL; ?>/assets/img/folder.svg" class="mediamatic_be_svg" />
								<span class="item-title"><?php esc_html_e('Uncategorized', MEDIAMATIC_TEXT_DOMAIN); ?></span>
							</li>


						</ul>
					</div>
					<!-- /#themedo-mediamatic-defaultTree -->

					<div id="themedo-mediamatic-folderTree" class="mediamatic_tree jstree-default">
						<?php
								$this->buildFolder($folders);
								?>
					</div>
				</div>
				<!-- #themedo-mediamatic-folderTree -->
			</div>
			<div class="mediamatic_splitter">
				<span class="mm_holder">
					<span class="a1"></span>
					<span class="a2"></span>
					<span class="a3"></span>
				</span>
			</div>
			<!-- .mediamatic_sidebar -->
		</div>
		<?php
			}



			private function mediamaticFindDepth($folder, $folders, $depth = 0)
			{
				if ($folder->parent != 0) {
					$depth 		= $depth + 1;
					$parent 	= $folder->parent;
					$find 		= array_filter($folders, function ($arr) use ($parent) {
						if ($arr->term_id == $parent) {
							return $arr;
						} else {
							return null;
						}
					});

					if (is_null($find)) {
						return $depth;
					} else {
						foreach ($find as $k2 => $v2) {
							return $this->mediamaticFindDepth($v2, $folders, $depth);
						}
					}
				} else {
					return $depth;
				}
			}


			private function buildFolder($folders)
			{
				$orders = array();
				foreach ($folders as $key => $row) {
					$orders[$key] = $key;
				}
				array_multisort($orders, SORT_ASC, $folders);

				echo '<form action="javascript:void(0);" id="update-folders" enctype="multipart/form-data" method="POST"><ul id="folders-to-edit" class="menu">';
				foreach ($folders as $k => $folder) {
					$depth = $this->mediamaticFindDepth($folder, $folders);

					$folder_count = $folder->count ?  "data-number={$folder->count}" : '';

					?>
			<li id="menu-item-<?php echo esc_attr($folder->term_id); ?>" data-id="<?php echo esc_attr($folder->term_id); ?>" <?php echo esc_html($folder_count) ?> class="menu-item menu-item-depth-<?php echo esc_html($depth); ?>">
				<span class="sub_opener"><span></span></span>
				<div class="menu-item-bar jstree-anchor">
					<div class="menu-item-handle">
						<img src="<?php echo MEDIAMATIC_URL; ?>/assets/img/folder.svg" class="mediamatic_be_svg" />
						<span class="item-title"><span class="menu-item-title"><?php echo esc_html($folder->name); ?></span>

					</div>
				</div>
				<span class="action_button">
					<span class="a1"></span>
					<span class="a2"></span>
					<span class="a3"></span>
				</span>
				<ul class="menu-item-transport"></ul>
				<input class="menu-item-data-db-id" type="hidden" name="menu-item-db-id[<?php echo esc_html($folder->term_id); ?>]" value="<?php echo esc_html($folder->term_id); ?>">
				<input class="menu-item-data-parent-id" type="hidden" name="menu-item-parent-id[<?php echo esc_html($folder->term_id); ?>]" value="<?php echo esc_html($folder->parent); ?>" />


			</li>
	<?php
			}


			echo '</ul></form>';
		}


		public function mediamaticAddFolderToAttachments()
		{
			register_taxonomy(
				MEDIAMATIC_FOLDER,
				array("attachment"),
				array(
					"hierarchical" 		=> true,
					"labels"			=> array(
						'name'          		=> esc_html__('Folder', MEDIAMATIC_TEXT_DOMAIN),
						'singular_name' 		=> esc_html__('Folder', MEDIAMATIC_TEXT_DOMAIN),
						'add_new_item'			=> esc_html__('Add New Folder', MEDIAMATIC_TEXT_DOMAIN),
						'edit_item' 			=> esc_html__('Edit Folder', MEDIAMATIC_TEXT_DOMAIN),
						'new_item' 				=> esc_html__('Add New Folder', MEDIAMATIC_TEXT_DOMAIN),
						'search_items' 			=> esc_html__('Search Folder', MEDIAMATIC_TEXT_DOMAIN),
						'not_found' 			=> esc_html__('Folder not found', MEDIAMATIC_TEXT_DOMAIN),
						'not_found_in_trash' 	=> esc_html__('Folder not found in trash', MEDIAMATIC_TEXT_DOMAIN),
					),
					'show_ui' 			=> true,
					'show_in_menu' 		=> false,
					'show_in_nav_menus'	=> false,
					'show_in_quick_edit' => false,
					'update_count_callback' => '_update_generic_term_count',
					'show_admin_column'	=> false,
					"rewrite" 			=> false
				)
			);
		}


		public function mediamaticAjaxUpdateFolderPositionCallback()
		{
			$result 	= sanitize_text_field($_POST["result"]);
			$result 	= explode("|", $result);
			foreach ($result as $key) {
				$key 	= explode(",", $key);
				update_term_meta($key[0], 'folder_position', $key[1]);
			}
			die();
		}


		public function mediamaticAjaxDeleteFolderListCallback()
		{
			$current 			= sanitize_text_field($_POST["current"]);
			$count_attachments 	= 0;
			$current_term 		= get_term($current, MEDIAMATIC_FOLDER);
			$count_attachments 	= $current_term->count;
			$term 				= wp_delete_term($current, MEDIAMATIC_FOLDER);

			if (is_wp_error($term)) {
				echo "error";
			}
			echo esc_html($count_attachments);
			die();
		}


		public static function mediamaticSetValidTermName($name, $parent)
		{
			if (!$parent) {
				$parent = 0;
			}

			$terms 	= get_terms(MEDIAMATIC_FOLDER, array('parent' => $parent, 'hide_empty' => false));
			$check 	= true;

			if (count($terms)) {
				foreach ($terms as $term) {
					if ($term->name === $name) {
						$check = false;
						break;
					}
				}
			} else {
				return $name;
			}


			if ($check) {
				return $name;
			}

			$arr = explode('_', $name);

			if ($arr && count($arr) > 1) {
				$suffix = array_values(array_slice($arr, -1))[0];

				//remove end item (suffix) of array
				array_pop($arr);

				//get folder base name (no suffix)
				$origin_name = implode($arr);

				if (intval($suffix)) {
					$name = $origin_name . '_' . (intval($suffix) + 1);
				}
			} else {
				$name = $name . '_1';
			}

			$name = self::mediamaticSetValidTermName($name, $parent);

			return $name;
		}

		private function slug_generator($string)
		{
			$string = strtolower($string);
			$slug	= preg_replace('/[^A-Za-z0-9-]+/', '-', $string);
			return $slug;
		}


		public function mediamaticAjaxUpdateFolderListCallback()
		{
			$current 	= sanitize_text_field($_POST["current"]);
			$new_name 	= sanitize_text_field($_POST["new_name"]);
			$parent 	= sanitize_text_field($_POST["parent"]);
			$type 		= sanitize_text_field($_POST["type"]);

			switch ($type) {
				case 'new':


					$folders 	= get_terms(MEDIAMATIC_FOLDER, array('hide_empty' => false));
					$count 		= count($folders) + 1;

					// light version limitation
					if (($count <= 12 && $this->mediamatic_free == true) || $this->mediamatic_free == false) {

						$name 		= self::mediamaticSetValidTermName($new_name, $parent);
						$term_new 	= wp_insert_term($name, MEDIAMATIC_FOLDER, array(
							'name' 		=> $name,
							'parent' 	=> $parent
						));

						if (is_wp_error($term_new)) {
							echo "error";
						} else {
							add_term_meta($term_new["term_id"], 'folder_type', sanitize_text_field($_POST["folder_type"]));
							add_term_meta($term_new["term_id"], 'folder_position', 9999);
							wp_send_json_success(array('term_id' => $term_new["term_id"], 'term_name' => $name));
						}
					}
					// light version limitation	
					break;

				case 'rename':
					$check_error = wp_update_term($current, MEDIAMATIC_FOLDER, array(
						'name' => $new_name
						//'slug' => $this->slug_generator($new_name)
					));
					if (is_wp_error($check_error)) {
						echo "error";
					}
					break;
				case 'move':
					$check_error = wp_update_term($current, MEDIAMATIC_FOLDER, array(
						'parent' => $parent
					));
					if (is_wp_error($check_error)) {
						echo "error";
					}
					break;
			}
			die();
		}


		public function mediamaticAjaxGetChildFoldersCallback()
		{
			$term_id 	= sanitize_text_field($_POST['folder_id']);
			$terms 		= get_terms(MEDIAMATIC_FOLDER, array(
				'hide_empty' 	=> false,
				'orderby' 		=> 'parent',
				'parent' 		=> $term_id
			));

			if (is_wp_error($terms)) {
				echo "error";
			}

			wp_send_json_success($terms);
		}


		public function mediamaticAjaxSaveSplitter()
		{
			$width = sanitize_text_field($_POST['splitter_width']);

			if (update_option('mediamatic_sidebar_width', $width)) {
				wp_send_json_success();
			} else {
				wp_send_json_error();
			}
		}

		public function mediamaticTermTreeOption($terms, $spaces = "-")
		{
			$html = '';

			if (!is_null($terms) && count($terms) > 0) {
				foreach ($terms as $item) {
					$html .= '<option value="' . $item->term_id . '" data-id="' . $item->term_id . '">' . $spaces . '&nbsp;' . $item->name . '</option>';

					if (is_array($item->children) && count($item->children) > 0) {
						$html .= $this->mediamaticTermTreeOption($item->children, str_repeat($spaces, 2));
					}
				}
			}
			return $html;
		}


		public function mediamaticTermTreeArray($taxonomy, $parent)
		{
			$terms = get_terms($taxonomy, array(
				'hide_empty' 	=> false,
				'orderby' 		=> 'parent',
				'parent' 		=> $parent
			));
			$children = array();

			// go through all the direct decendants of $parent, and gather their children
			foreach ($terms as $term) {
				// recurse to get the direct decendants of "this" term
				$term->children = $this->mediamaticTermTreeArray($taxonomy, $term->term_id);
				// add the term to our new array
				$children[] 	= $term;
			}
			// send the results back to the caller
			return $children;
		}



		// show in upload file when add Media on all page
		public function mediamaticPreUploadInterface()
		{
			$terms 		= $this->mediamaticTermTreeArray(MEDIAMATIC_FOLDER, 0);
			$options 	= $this->mediamaticTermTreeOption($terms);
			$label 		= esc_html__("Select a folder and upload files (Optional)", MEDIAMATIC_TEXT_DOMAIN);

			echo '<p class="attachments-category">' . $label . '<br/></p>
				<p>
					<select name="themedoWMCFolder" class="themedo-mediamatic-editcategory-filter"><option value="-1">-' . esc_html__('Uncategorized', MEDIAMATIC_TEXT_DOMAIN) . '</option>' . $options . '</select>
				</p>';
		}


		private function get_strings()
		{
			$array = array(
				'move_1_file' 					=> esc_html__('Move 1 file', MEDIAMATIC_TEXT_DOMAIN),
				'oops' 							=> esc_html__('Oops', MEDIAMATIC_TEXT_DOMAIN),
				'error' 						=> esc_html__('Error', MEDIAMATIC_TEXT_DOMAIN),
				'this_folder_is_already_exists' => esc_html__('This folder already exists. Please type another name.', MEDIAMATIC_TEXT_DOMAIN),
				'error_occurred' 				=> esc_html__('Sorry! An error occurred while processing your request.', MEDIAMATIC_TEXT_DOMAIN),
				'folder_cannot_be_delete' 		=> esc_html__('This folder cannot be deleted.', MEDIAMATIC_TEXT_DOMAIN),
				'add_sub_folder' 				=> esc_html__('Add Sub folder', MEDIAMATIC_TEXT_DOMAIN),
				'new_folder' 					=> esc_html__('New folder', MEDIAMATIC_TEXT_DOMAIN),
				'rename' 						=> esc_html__('Rename', MEDIAMATIC_TEXT_DOMAIN),
				'remove' 						=> esc_html__('Remove', MEDIAMATIC_TEXT_DOMAIN),
				'delete' 						=> esc_html__('Delete', MEDIAMATIC_TEXT_DOMAIN),
				'refresh' 						=> esc_html__('Refresh', MEDIAMATIC_TEXT_DOMAIN),
				'something_not_correct' 		=> esc_html__('Something isn\'t correct here.', MEDIAMATIC_TEXT_DOMAIN),
				'this_page_will_reload' 		=> esc_html__('This page will be reloaded now.', MEDIAMATIC_TEXT_DOMAIN),
				'folder_are_sub_directories' 	=> esc_html__('This folder contains subfolders, you should delete subfolders first!', MEDIAMATIC_TEXT_DOMAIN),
				'are_you_sure' 					=> esc_html__('Are you sure?', MEDIAMATIC_TEXT_DOMAIN),
				'not_able_recover_folder' 		=> esc_html__('All files inside this folder gets moved to "Uncategorized" folder.', MEDIAMATIC_TEXT_DOMAIN),
				'yes_delete_it' 				=> esc_html__('Delete!', MEDIAMATIC_TEXT_DOMAIN),
				'deleted' 						=> esc_html__('Deleted', MEDIAMATIC_TEXT_DOMAIN),
				'Move' 							=> esc_html__('Move', MEDIAMATIC_TEXT_DOMAIN),
				'files' 						=> esc_html__('files', MEDIAMATIC_TEXT_DOMAIN),
				'limit_folder_title' 			=> esc_html__('Folder Limit Reached', MEDIAMATIC_TEXT_DOMAIN),
				'limit_folder_content' 			=> esc_html__('The Mediamatic Lite version allows you to manage up to 12 folders.<br>To have unlimited folders, please upgrade to PRO version.</br></br><span class="upgrade_features">Unlimited Folders</br>Get Fast Updates</br>Lifetime Support</br>30-day Refund Guarantee</span></br></br>', MEDIAMATIC_TEXT_DOMAIN),
				'folder_deleted' 				=> esc_html__('Your folder has been deleted.', MEDIAMATIC_TEXT_DOMAIN),
				'upgrade' 						=> esc_html__('Get Pro', MEDIAMATIC_TEXT_DOMAIN),
				'no_thanks' 					=> esc_html__('No, thanks', MEDIAMATIC_TEXT_DOMAIN),
				'cancel' 						=> esc_html__('Cancel', MEDIAMATIC_TEXT_DOMAIN),
				'reload' 						=> esc_html__('Reload', MEDIAMATIC_TEXT_DOMAIN),
				'folder_name_enter' 			=> esc_html__('Please enter your folder name.', MEDIAMATIC_TEXT_DOMAIN),
			);
			return $array;
		}
	}

	new Mediamatic_Interface();
