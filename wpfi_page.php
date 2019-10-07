<?php

// Check if form is submited
if (isset($_POST["wpfiImportUrl"])) {
  $wpfiImportUrl = $_POST["wpfiImportUrl"];

  // Check if input is empty
  if ($wpfiImportUrl == "") {
    showMessage("danger", "Directory is required");
  }


  // Check if input starts with "wp-content/uploads/"
  if (strncmp($wpfiImportUrl, "wp-content/uploads/", 19) != 0) {
    showMessage("danger", "Invalid input, try again");
    showForm();
    exit;
  }

  // Start scan
  $dir = "../" . $wpfiImportUrl;
  scanFolders($dir);
}



// Scan files

function scanFolders($dir)

{

  try {

    $iterator = new RecursiveDirectoryIterator($dir);
    $iterator->setFlags(RecursiveDirectoryIterator::SKIP_DOTS);
    $all_files  = new RecursiveIteratorIterator($iterator);
    $images = new RegexIterator($all_files, '/^.*\.(jpg|JPG|gif|GIF|png|PNG)$/');

    // Check if iterator result is 0
    $total_results = iterator_count($images);

    if ($total_results == 0) {

      showMessage("danger", "No files found.");

      showForm();

      exit;
    }



    // Extract info from files

    foreach ($images as $img) {

      $fileFullPath = $img->getPath() . "/" . $img->getFilename();
      $fileUrl = get_site_url() . substr($fileFullPath, 2);
      $encodedUrl = esc_url_raw($fileUrl);
      $fileName = preg_replace('/\.[^.]+$/', '', $img->getFilename());
      // Item exists so skip to next item
      if (fileExists($encodedUrl)) {
        $existTrue = true;
        continue;
      }

      $filePath = $img->getPath();

      $fileNameWithExt = $img->getFilename();

      $fileSize = @getimagesize($fileUrl);

      $fileHeight = $fileSize[0];

      $fileWidth = $fileSize[1];

      $fileMimeType = $fileSize['mime'];

      $fileFolderTree = substr($filePath, 22);

      // Avoid duplicate files

      // Create folder if not exists
      $root_id = get_term_by('slug', 'wpfi-root-folder', 'wpfi_category')->term_id;
      $folders = preg_split("#/#", $fileFolderTree);

      // Set parent to root by default
      $parent = $root_id;
      $lastItem = sizeof($folders);

      // For each sub
      foreach ($folders as $index => $folder) {
        $fileParent = null;
        $parentExists = term_exists($folder, 'wpfi_category', $parent);
        if ($parentExists['term_id'] != 0) {
          $parent = $parentExists['term_id'];
          $fileParent = $parent;
        } else {
          if (!term_exists($folder, 'wpfi_category', $parent)) {
            if ($index == 0) {
              $create_folder = wp_insert_term($folder, 'wpfi_category', array('parent' => $root_id));
              $parent = isset($create_folder['term_id']) ? $create_folder['term_id'] : $root_id;

              // Add term meta
              add_term_meta($parent, 'folder_type', 'default');

              $fileParent = $parent;
            } elseif ($index == $lastItem and !term_exists($folder, 'wpfi_category', $parent)) {
              $create_folder = wp_insert_term($folder, 'wpfi_category', array('parent' => $parent));
              $fileParent = $parent;
              $parent = $root_id;

              // Add term meta
              add_term_meta($parent, 'folder_type', 'default');
              continue;
            } else if ($index != 0 and $index != $lastItem and !term_exists($folder, 'wpfi_category', $parent)) {
              $create_folder = wp_insert_term($folder, 'wpfi_category', array('parent' => $parent));
              $parent = isset($create_folder['term_id']) ? $create_folder['term_id'] : $parent;

              // Add term meta
              add_term_meta($parent, 'folder_type', 'default');
              $fileParent = $parent;
            }
          }
        }
      }

      // Pass data to insertToTable function 
      insertToTable($fileName, $fileUrl, $fileHeight, $fileWidth, $fileMimeType, $fileParent);
    }



    // Show success message

    if ($existTrue) {
      showExitsMessage();
    }

    showMessage("success", "Done!");


    // Check if directory path is wrong or not found

  } catch (exception $e) {

    showMessage("danger", "Directory not found");
  }
}



// Insert Image Into Database table (Used by cron-job)

function insertToTable($fileName, $fileUrl, $fileHeight, $fileWidth, $fileMimeType, $fileParent)

{

  global $wpdb;

  $wpdb->insert($wpdb->prefix . 'wpfi_files', array(

    'fileName' => $fileName,

    'fileUrl' => $fileUrl,

    'fileHeight' => $fileHeight,

    'fileWidth' => $fileWidth,

    'fileMimeType' => $fileMimeType,

    'fileParent' => $fileParent

  ));
}



// Show Message 

// Type can be bootstrap classes like: primary, danger, success etc...

// Message is a string to be shown

function showMessage($type, $message)

{

  echo

    '<div class="wrap wpfi-content alert alert-' . $type . '" role="alert">

    ' . $message . '

  </div>';
}



function showExitsMessage()
{
  showMessage("danger", "Some files were skipped as they already exists");
}


// Show Import Form

function showForm()

{

  ?>

  <div class="wrap wpfi-content">

    <header class="wpfi-header">

      <h1 class="wpfi-title">

        WP FTP Images - Import

      </h1>

      <h6 class="byLine">Developed by Hevger Ibrahim</h6>

    </header>

    <section>

      <?php

        // Load status file

        require("wpfi_form_and_status.php");

        ?>

    </section>

  </div>

<?php

}



// Run Show Form Function
showForm();
