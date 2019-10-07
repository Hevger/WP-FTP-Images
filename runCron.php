<?php
// Custom timer
add_filter('cron_schedules', 'wpfi_cron_one_minute');
function wpfi_cron_one_minute($schedules)
{
  $schedules['oneminute'] = array(
    'interval' => 60,
    'display' => 'Each minute'
  );
  return $schedules;
}

// Create cron
function wp_setup_cron()
{
  //check if event scheduled before
  if (!wp_next_scheduled('wpfi_cron'))
    wp_schedule_event(time(), 'oneminute', 'wpfi_cron');
}

// Check if cron need to be deleted
if (listEmpty() == 0) {
  // Remove cron
  $event_timestamp = wp_next_scheduled('wpfi_cron');
  wp_unschedule_event($event_timestamp, 'wpfi_cron');
} else {
  // Add cron
  add_action('init', 'wp_setup_cron');
  add_action('wpfi_cron', 'wpfi_push_media');
}

// Code to be executed 
function wpfi_push_media()
{
  insert100Records();
}


function insert100Records()
{
  global $wpdb;

  $wpfi_table = $wpdb->prefix . 'wpfi_files';

  $images = $wpdb->get_results("SELECT * FROM $wpfi_table ORDER BY id ASC LIMIT 1000");


  foreach ($images as $img) {

    $id = $img->id;

    $fileName = $img->fileName;

    $fileUrl = $img->fileUrl;

    $fileHeight = $img->fileHeight;

    $fileWidth = $img->fileWidth;

    $fileMimeType = $img->fileMimeType;

    $fileParent = $img->fileParent;

    // Add to library and folder(later coming soon)
    addToLibrary($fileName, $fileUrl, $fileHeight, $fileWidth, $fileMimeType, $fileParent);
    // Remove from list
    deleteFromList($id);
  }
}




// Add to media library

function addToLibrary($fileName, $fileUrl, $fileHeight, $fileWidth, $fileMimeType, $fileParent)

{

  $fileName = wp_basename($fileUrl);

  $attachment = array(
    'guid' => $fileUrl,
    'post_mime_type' => $fileMimeType,
    'post_title' => $fileName,
  );

  $attachment_metadata = array(
    'width' => $fileWidth,
    'height' => $fileHeight,
    'file' => $fileName
  );


  $attachment_metadata['sizes'] = array('full' => $attachment_metadata);
  $attachment_id = wp_insert_attachment($attachment);
  wp_update_attachment_metadata($attachment_id, $attachment_metadata);
  wp_set_post_terms($attachment_id, $fileParent, 'wpfi_category');
}


// Delete from list
function deleteFromList($id)

{

  global $wpdb;

  $wpfi_table = $wpdb->prefix . 'wpfi_files';

  $wpdb->delete($wpfi_table, array('id' => $id));
}
