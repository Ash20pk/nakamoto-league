-- Create API function for admin to get articles with pagination, search, and tag filtering
CREATE OR REPLACE FUNCTION get_admin_articles(
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT '',
  p_tag TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_articles JSONB;
  v_total_count INTEGER;
  v_all_tags TEXT[];
BEGIN
  -- Get all unique tags for filtering
  SELECT ARRAY(
    SELECT DISTINCT unnest(tags)
    FROM articles
    WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
  ) INTO v_all_tags;
  
  -- Build the query for articles with search and tag filtering
  WITH filtered_articles AS (
    SELECT *
    FROM articles
    WHERE 
      (p_search = '' OR 
        title ILIKE '%' || p_search || '%' OR 
        summary ILIKE '%' || p_search || '%' OR 
        author ILIKE '%' || p_search || '%'
      )
      AND
      (p_tag IS NULL OR p_tag = '' OR p_tag = ANY(tags))
  ),
  count_query AS (
    SELECT COUNT(*) as total_count FROM filtered_articles
  ),
  article_data AS (
    SELECT 
      id,
      title,
      slug,
      summary,
      author,
      published_at,
      reading_time_minutes,
      banner_url,
      tags
    FROM filtered_articles
    ORDER BY published_at DESC
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT 
    jsonb_agg(to_jsonb(article_data)),
    (SELECT total_count FROM count_query)
  INTO 
    v_articles,
    v_total_count
  FROM article_data;
  
  -- Handle empty results
  IF v_articles IS NULL THEN
    v_articles := '[]'::jsonb;
  END IF;
  
  -- Return results with pagination info and all tags
  RETURN jsonb_build_object(
    'articles', v_articles,
    'total_count', v_total_count,
    'limit', p_limit,
    'offset', p_offset,
    'all_tags', v_all_tags
  );
END;
$$;
