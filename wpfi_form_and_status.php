<?php



// Check if there is files waiting to be inserted

listEmpty() == 0 ? notBusy() : isBusy();

// Show busy message

function isBusy()

{
  // Show alert when task is still not completed

  ?>

  <div class='alert alert-secondary mt-3 d-flex justify-content-center' role='alert'>

    <div class='wrap statusCircleIsBusy'></div>

    <h1 class='statusText'>Task is running, come back when the task is completed</h1>

  </div>

<?php

}



// Show not busy message

function notBusy()

{

  // Show alert when no task is active

  ?>

  <div class='alert alert-secondary mt-3 d-flex justify-content-center' role='alert'>

    <div class='wrap statusCircleNotBusy'></div>

    <h1 class='statusText'>No tasks is running you can add new task</h1>

  </div>

  <form action="" method="POST">

    <div class="form-group mt-3">

      <small class="form-text text-muted mb-3">

        1. Your folders/files must be in "wp-content/uploads" directory.

        <br>

        2. You can only choose one directory and the plugin will get sub-folders automatically.

      </small>

      <input type="text" class="form-control" pattern="^wp-content/uploads/.*" oninvalid="setCustomValidity('Input must starts with \'wp-content/uploads\' ')" name="wpfiImportUrl" id="wpfiImportUrl" value="wp-content/uploads/" required>

    </div>

    <div class="text-center">

      <button type="submit" class="btn btn-primary">Submit</button>

    </div>

  </form>
<?php

}
