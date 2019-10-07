<?php

/** If this file is called directly, abort. */
if (!defined('ABSPATH')) {
    exit;
}


/**
 * class Mediamatic_Topbar
 * the main class
 */
class Mediamatic_Topbar
{


    public $plugin_version = MEDIAMATIC_VERSION;


    public function __construct()
    {
        // load code that is only needed in the admin section
        if (is_admin()) {
            add_action('add_attachment', array($this, 'mediamaticAddAttachmentCategory'));
            add_action('edit_attachment', array($this, 'mediamaticSetAttachmentCategory'));
            add_filter('ajax_query_attachments_args', array($this, 'mediamaticAjaxQueryAttachmentsArgs'));
            add_action('admin_enqueue_scripts', array($this, 'mediamaticEnqueueMediaAction'));
            add_action('wp_ajax_save-attachment-compat', array($this, 'mediamaticSaveAttachmentCompat'), 0);
            add_action('wp_ajax_mediamaticSaveAttachment', array($this, 'mediamaticSaveAttachment'), 0);
            add_action('wp_ajax_mediamaticGetTermsByAttachment', array($this, 'mediamaticGetTermsByAttachment'), 0);
            add_action('wp_ajax_mediamaticSaveMultiAttachments', array($this, 'mediamaticSaveMultiAttachments'), 0);
        }
    }


    public function mediamaticAddAttachmentCategory($post_ID)
    {
        $mediamatic_Folder = isset($_REQUEST["themedoWMCFolder"]) ? sanitize_text_field($_REQUEST["themedoWMCFolder"]) : null;
        if (is_null($mediamatic_Folder)) {
            $mediamatic_Folder = isset($_REQUEST["themedo_mediamatic_folder"]) ? sanitize_text_field($_REQUEST["themedo_mediamatic_folder"]) : null;
        }
        if ($mediamatic_Folder !== null) {
            $mediamatic_Folder = (int) $mediamatic_Folder;
            if ($mediamatic_Folder > 0) {
                wp_set_object_terms($post_ID, $mediamatic_Folder, MEDIAMATIC_FOLDER, false);
            }
        }
    }


    public function mediamaticSetAttachmentCategory($post_ID)
    {
        $taxonomy = MEDIAMATIC_FOLDER;
        $taxonomy = apply_filters('mediamatic_taxonomy', $taxonomy);

        // if attachment already have categories, stop here
        if (wp_get_object_terms($post_ID, $taxonomy)) {
            return;
        }

        // no, then get the default one
        $post_category = array(get_option('default_category'));

        // then set category if default category is set on writting page
        if ($post_category) {
            wp_set_post_categories($post_ID, $post_category);
        }
    }


    public static function mediamaticGetTermsValues($keys = 'ids')
    {

        // Get media taxonomy
        $media_terms = get_terms(MEDIAMATIC_FOLDER, array(
            'hide_empty' => 0,
            'fields'     => 'id=>slug',
        ));
        $media_values = array();

        foreach ($media_terms as $key => $value) {
            $media_values[] = ($keys === 'ids')
                ? $key
                : $value;
        }

        return $media_values;
    }


    public function mediamaticAjaxQueryAttachmentsArgs($query = array())
    {

        $taxquery             = isset($_REQUEST['query']) ? (array) $_REQUEST['query'] : array();
        $taxonomies         = get_object_taxonomies('attachment', 'names');
        $taxquery             = array_intersect_key($taxquery, array_flip($taxonomies));
        $query                 = array_merge($query, $taxquery); // merge our query into the WordPress query
        $query['tax_query'] = array('relation' => 'AND');

        foreach ($taxonomies as $taxonomy) {
            if (isset($query[$taxonomy]) && is_numeric($query[$taxonomy])) {
                if ($query[$taxonomy] > 0) {
                    array_push($query['tax_query'], array(
                        'taxonomy' => $taxonomy,
                        'field'    => 'id',
                        'terms'    => $query[$taxonomy],
                        'include_children'  => false
                    ));
                } else {
                    $all_terms_ids = self::mediamaticGetTermsValues('ids');
                    array_push($query['tax_query'], array(
                        'taxonomy' => $taxonomy,
                        'field'    => 'id',
                        'terms'    => $all_terms_ids,
                        'operator' => 'NOT IN',
                    ));
                }
            }
            unset($query[$taxonomy]);
        }

        return $query;
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

        $attachment_terms     = wp_dropdown_categories($dropdown_options);
        $attachment_terms     = preg_replace(array("/<select([^>]*)>/", "/<\/select>/"), "", $attachment_terms);

        echo '<script type="text/javascript">';
        echo '/* <![CDATA[ */';
        echo 'var mediamatic_folder = "' . MEDIAMATIC_FOLDER . '";';
        echo 'var mediamatic_taxonomies = {"folder":{"list_title":"' . html_entity_decode(esc_html__('All categories', MEDIAMATIC_TEXT_DOMAIN), ENT_QUOTES, 'UTF-8') . '","term_list":[{"term_id":"-1","term_name":"' . esc_html__('Uncategorized', MEDIAMATIC_TEXT_DOMAIN) . '"},' . substr($attachment_terms, 2) . ']}};';
        echo '/* ]]> */';
        echo '</script>';

        wp_enqueue_script('mediamatic-admin-topbar', plugins_url('assets/js/mediamatic-admin-topbar' . $suffix . '.js', dirname(__FILE__)), array('media-views'), $this->plugin_version, true);
    }


    public function mediamaticSaveAttachmentCompat()
    {
        if (!isset($_REQUEST['id'])) {
            wp_send_json_error();
        }

        if (!$id = absint($_REQUEST['id'])) {
            wp_send_json_error();
        }

        if (empty($_REQUEST['attachments']) || empty($_REQUEST['attachments'][$id])) {
            wp_send_json_error();
        }
        $attachment_data = sanitize_text_field($_REQUEST['attachments'][$id]);

        if (current_user_can('edit_post', $id)) {
            check_ajax_referer('update-post_' . $id, 'nonce');
        }

        if (!current_user_can('edit_post', $id)) {
            wp_send_json_error();
        }

        $post = get_post($id, ARRAY_A);

        if ('attachment' != $post['post_type']) {
            wp_send_json_error();
        }

        $post = apply_filters('attachment_fields_to_save', $post, $attachment_data);

        if (isset($post['errors'])) {
            $errors = $post['errors'];
            unset($post['errors']);
        }

        wp_update_post($post);

        foreach (get_attachment_taxonomies($post) as $taxonomy) {

            if (isset($attachment_data[$taxonomy])) {
                wp_set_object_terms($id, array_map('trim', preg_split('/,+/', $attachment_data[$taxonomy])), $taxonomy, false);
            } else if (isset($_REQUEST['tax_input']) && isset($_REQUEST['tax_input'][$taxonomy])) {
                wp_set_object_terms($id, sanitize_text_field($_REQUEST['tax_input'][$taxonomy]), $taxonomy, false);
            } else {
                wp_set_object_terms($id, '', $taxonomy, false);
            }
        }

        if (!$attachment = wp_prepare_attachment_for_js($id)) {
            wp_send_json_error();
        }

        wp_send_json_success($attachment);
    }

    public function mediamaticSaveMultiAttachments()
    {

        $ids         = $_REQUEST['ids'];
        $result     = array();

        foreach ($ids as $key => $id) {
            $term_list     = wp_get_post_terms(sanitize_text_field($id), MEDIAMATIC_FOLDER, array('fields' => 'ids'));
            $from         = -1;

            if (count($term_list)) {
                $from = $term_list[0];
            }

            $obj         = (object) array('id' => $id, 'from' => $from, 'to' => sanitize_text_field($_REQUEST['folder_id']));
            $result[]     = $obj;

            wp_set_object_terms($id, intval(sanitize_text_field($_REQUEST['folder_id'])), MEDIAMATIC_FOLDER, false);
        }

        wp_send_json_success($result);
    }


    public function mediamaticSaveAttachment()
    {
        if (!isset($_REQUEST['id'])) {
            wp_send_json_error();
        }

        if (!$id = absint(sanitize_text_field($_REQUEST['id']))) {
            wp_send_json_error();
        }

        if (empty($_REQUEST['attachments']) || empty($_REQUEST['attachments'][$id])) {
            wp_send_json_error();
        }
        $attachment_data = $_REQUEST['attachments'][$id];

        $post = get_post($id, ARRAY_A);

        if ('attachment' != $post['post_type']) {
            wp_send_json_error();
        }

        $post = apply_filters('attachment_fields_to_save', $post, $attachment_data);

        if (isset($post['errors'])) {
            $errors = $post['errors'];
            unset($post['errors']);
        }

        wp_update_post($post);


        wp_set_object_terms($id, intval(sanitize_text_field($_REQUEST['folder_id'])), MEDIAMATIC_FOLDER, false);
        if (!$attachment = wp_prepare_attachment_for_js($id)) {
            wp_send_json_error();
        }

        wp_send_json_success($attachment);
    }


    public function mediamaticGetTermsByAttachment()
    {

        $nonce = sanitize_text_field($_POST['nonce']);

        if (!wp_verify_nonce($nonce, 'ajax-nonce')) {
            wp_send_json_error();
        }

        if (!isset($_REQUEST['id'])) {
            wp_send_json_error();
        }
        if (!$id = absint(sanitize_text_field($_REQUEST['id']))) {
            wp_send_json_error();
        }
        $terms  = get_the_terms($id, MEDIAMATIC_FOLDER);
        wp_send_json_success($terms);
    }





    public static function get_uncategories_attachment()
    {
        $args = array(
            'post_type'         => 'attachment',
            'post_status'         => 'inherit,private',
            'posts_per_page'     => -1,
            'tax_query'         => array(
                'relation'     => 'AND',
                0 => array(
                    'taxonomy'     => MEDIAMATIC_FOLDER,
                    'field'     => 'id',
                    'terms'     =>  self::mediamaticGetTermsValues('ids'),
                    'operator'     => 'NOT IN'
                )
            )
        );
        $result = get_posts($args);
        return count($result);
    }
}

$mediamatic_topbar = new Mediamatic_Topbar();
