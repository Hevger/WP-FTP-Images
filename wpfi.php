<?php
/*
Plugin Name: WP FTP Images 
Description: Use external images directly from your FTP folders
Version: 1.0.0
Author: Hevger Ibrahim
Author URI: https://iibrahim.me/
License: GPLv3
License URI: https://www.gnu.org/licenses/gpl-3.0-standalone.html
*/

// Create database if not found
// register_activation_hook(__FILE__, 'wpfi_create_database');
add_action('init', 'wpfi_create_database');
function wpfi_create_database()
{
	global $wpdb;
	$charset_collate = $wpdb->get_charset_collate();
	$wpfi_table = $wpdb->prefix . 'wpfi_files';
	$sql = "CREATE TABLE $wpfi_table (
	`id` INT NOT NULL AUTO_INCREMENT,
	`fileName` TEXT(255) NOT NULL,
	`fileUrl` TEXT(255) NOT NULL,
	`fileHeight` INT NOT NULL,
	`fileWidth` INT NOT NULL,
	`fileMimeType` VARCHAR(255) NOT NULL,
	`fileParent` INT NOT NULL,
	PRIMARY KEY (`id`)
) $charset_collate;";
	require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
	dbDelta($sql);
}

// Register CSS styles And Javascript
function init_wpfi()
{
	// CSS
	wp_register_style('wpfi-css', plugins_url('/css/wpfi-style.css', __FILE__));
	wp_enqueue_style('wpfi-css');
	wp_register_style('prefix_-bootstrap', plugins_url('/css/bootstrap.css', __FILE__));
	wp_enqueue_style('prefix_-bootstrap');

	// // Script
	// wp_register_script('wpfi-js', plugins_url('/js/wpfi_script.js', __FILE__));
	// wp_enqueue_script('wpfi-js');
}
add_action('admin_enqueue_scripts', 'init_wpfi');



// Register Menu
function wpfi_register_menu()
{
	add_menu_page(
		'WP FTP Images Import',
		'WP FTP Images',
		'manage_options',
		'wp_ftp_images_import',
		'wpfi_page',
		'dashicons-images-alt',
		11
	);
}
add_action('admin_menu', 'wpfi_register_menu');



function listEmpty()
{
	global $wpdb;
	$wpfi_table = $wpdb->prefix . 'wpfi_files';
	$listLength = $wpdb->get_var("SELECT COUNT(*) FROM $wpfi_table");
	return $listLength;
}

// Only run cron if list has files
if (listEmpty() != 0) {
	include_once "runCron.php";
}

// Function to check if file exists in library
function fileExists($url)
{
	global $wpdb;
	$wp_posts = $wpdb->prefix . 'posts';
	$exists = $wpdb->get_var("SELECT COUNT(*) FROM $wp_posts WHERE guid = '$url' AND post_type = 'attachment'");
	return $exists == 0 ? false : true;
}

// Load pwfi_page.php
function wpfi_page()
{
	include_once "wpfi_page.php";
}

// Create plugin taxonomy
function wpfi_register_plugin_category()
{
	$labels = array(
		'name'              => __('WPFI Categories', 'wpfi'),
		'singular_name'     => __('WPFI Category', 'wpfi'),
		'menu_name'         => __('WPFI Categories', 'wpfi'),
		'all_items'         => __('All WPFI Categories', 'wpfi'),
		'edit_item'         => __('Edit WPFI Category', 'wpfi'),
		'view_item'         => __('View WPFI Category', 'wpfi'),
		'update_item'       => __('Update WPFI Category', 'wpfi'),
		'add_new_item'      => __('Add New WPFI Category', 'wpfi'),
		'new_item_name'     => __('New WPFI Category Name', 'wpfi'),
		'parent_item'       => __('Parent WPFI Category', 'wpfi'),
		'parent_item_colon' => __('Parent WPFI Category:', 'wpfi'),
		'search_items'      => __('Search WPFI Categories', 'wpfi'),
	);

	$args = array(
		"label" => __("WP FTP Images Categories", "wpfi"),
		"labels" => $labels,
		"public" => false,
		"publicly_queryable" => true,
		"hierarchical" => true,
		"show_ui" => true,
		"show_in_menu" => false,
		"show_in_nav_menus" => false,
		"query_var" => true,
		"rewrite" => array('slug' => 'wpfi_category', 'with_front' => true,),
		"show_admin_column" => false,
		"show_in_rest" => true,
		"rest_base" => "wpfi_category",
		"rest_controller_class" => "WP_REST_Terms_Controller",
		"show_in_quick_edit" => false,
		'update_count_callback' => '_update_generic_term_count',
	);
	register_taxonomy("wpfi_category", array("attachment"), $args);

	// Create root folder
	wp_insert_term('WPFI - ROOT Folder', 'wpfi_category', array('parent' => 0));
}
add_action('init', 'wpfi_register_plugin_category');

///////////// ################### EXTERNAL CODE TO CREATE TREE 

if (!defined('ABSPATH')) {
	exit;
}

define('MEDIAMATIC__FILE__', __FILE__);
define('MEDIAMATIC_FOLDER', 'wpfi_category');
define('MEDIAMATIC_VERSION', '1.7');
define('MEDIAMATIC_PATH', plugin_dir_path(MEDIAMATIC__FILE__));
define('MEDIAMATIC_URL', plugins_url('/', MEDIAMATIC__FILE__));
define('MEDIAMATIC_ASSETS_URL', MEDIAMATIC_URL . 'assets/');
define('MEDIAMATIC_TEXT_DOMAIN', 'wpfi');
define('MEDIAMATIC_PLUGIN_BASE', plugin_basename(MEDIAMATIC__FILE__));


function mediamatic_plugins_loaded()
{
	// main files
	include_once(MEDIAMATIC_PATH . 'inc/plugin.php');
	include_once(MEDIAMATIC_PATH . 'inc/functions.php');
	load_plugin_textdomain(MEDIAMATIC_TEXT_DOMAIN);
}

add_action('plugins_loaded', 'mediamatic_plugins_loaded');
