<?php

/** Custom walker for wp_dropdown_categories for media grid view filter */
class Mediamatic_Walker_Category_Mediagridfilter extends Walker_CategoryDropdown 
{
    function start_el( &$output, $category, $depth = 0, $args = array(), $id = 0 ) 
	{
		$pad 		= str_repeat( '&nbsp;', $depth * 3 );
		
		if(isset($category->name))
		{
			$cat_name 	= apply_filters( 'list_cats', $category->name, $category );
			
			$output .= ',{"term_id":"' . $category->term_id . '",';

			$output .= '"term_name":"' . $pad . esc_attr( $cat_name );
			if ( $args['show_count'] ) {

				$output .= '&nbsp;&nbsp;';
			}
			$output .= '"}';
		}
		
    }

}
