-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  summary TEXT,
  author TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reading_time_minutes INTEGER NOT NULL DEFAULT 5,
  banner_url TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create article_reads table to track which warriors have read which articles
CREATE TABLE IF NOT EXISTS article_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  warrior_id UUID NOT NULL REFERENCES warriors(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_percentage INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  UNIQUE(article_id, warrior_id)
);

-- Create function to mark an article as read and update warrior XP
CREATE OR REPLACE FUNCTION mark_article_read(
  p_article_id UUID,
  p_warrior_id UUID,
  p_read_percentage INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_xp_earned INTEGER := 0;
  v_completed BOOLEAN := FALSE;
  v_result JSONB;
  v_existing_read article_reads%ROWTYPE;
BEGIN
  -- Check if warrior has already read this article
  SELECT * INTO v_existing_read FROM article_reads 
  WHERE article_id = p_article_id AND warrior_id = p_warrior_id;
  
  -- Calculate XP based on read percentage (only award XP for new progress)
  IF v_existing_read.id IS NULL THEN
    -- New read
    v_xp_earned := CASE 
      WHEN p_read_percentage >= 100 THEN 50 -- Full read
      WHEN p_read_percentage >= 75 THEN 35  -- 75% read
      WHEN p_read_percentage >= 50 THEN 25  -- 50% read
      WHEN p_read_percentage >= 25 THEN 15  -- 25% read
      ELSE 5                                -- Started reading
    END;
    v_completed := p_read_percentage >= 100;
  ELSE
    -- Existing read - only award XP for additional progress
    IF p_read_percentage > v_existing_read.read_percentage THEN
      -- Calculate XP for the additional progress
      v_xp_earned := CASE 
        WHEN p_read_percentage >= 100 AND v_existing_read.read_percentage < 100 THEN 15
        WHEN p_read_percentage >= 75 AND v_existing_read.read_percentage < 75 THEN 10
        WHEN p_read_percentage >= 50 AND v_existing_read.read_percentage < 50 THEN 10
        WHEN p_read_percentage >= 25 AND v_existing_read.read_percentage < 25 THEN 5
        ELSE 0
      END;
      v_completed := p_read_percentage >= 100;
    ELSE
      -- No new progress
      v_xp_earned := 0;
      v_completed := v_existing_read.completed;
    END IF;
  END IF;
  
  -- Insert or update the article_reads record
  INSERT INTO article_reads (article_id, warrior_id, read_percentage, completed, xp_earned)
  VALUES (p_article_id, p_warrior_id, p_read_percentage, v_completed, v_xp_earned)
  ON CONFLICT (article_id, warrior_id) 
  DO UPDATE SET 
    read_percentage = GREATEST(article_reads.read_percentage, p_read_percentage),
    completed = v_completed,
    xp_earned = article_reads.xp_earned + v_xp_earned,
    read_at = NOW()
  RETURNING * INTO v_existing_read;
  
  -- Update warrior experience if XP was earned
  IF v_xp_earned > 0 THEN
    UPDATE warriors
    SET experience = COALESCE(experience, 0) + v_xp_earned,
        level = CASE 
          WHEN COALESCE(experience, 0) + v_xp_earned >= level * 100 THEN level + 1
          ELSE level
        END
    WHERE id = p_warrior_id;
  END IF;
  
  -- Return the result
  v_result := jsonb_build_object(
    'success', TRUE,
    'xp_earned', v_xp_earned,
    'completed', v_completed,
    'read_percentage', v_existing_read.read_percentage
  );
  
  RETURN v_result;
END;
$$;

-- Create function to get daily article reading stats for a warrior
CREATE OR REPLACE FUNCTION get_warrior_daily_article_stats(p_warrior_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_articles_read INTEGER;
  v_articles_completed INTEGER;
  v_total_xp_earned INTEGER;
BEGIN
  -- Get today's article stats
  SELECT 
    COUNT(DISTINCT article_id),
    COUNT(DISTINCT CASE WHEN completed THEN article_id END),
    COALESCE(SUM(xp_earned), 0)
  INTO 
    v_articles_read,
    v_articles_completed,
    v_total_xp_earned
  FROM article_reads
  WHERE warrior_id = p_warrior_id
  AND read_at >= CURRENT_DATE;
  
  -- Build result
  v_result := jsonb_build_object(
    'articles_read', v_articles_read,
    'articles_completed', v_articles_completed,
    'total_xp_earned', v_total_xp_earned,
    'date', CURRENT_DATE
  );
  
  RETURN v_result;
END;
$$;

-- Insert some sample articles
INSERT INTO articles (title, slug, content, summary, author, reading_time_minutes, banner_url, tags)
VALUES 
  (
    'Understanding Bitcoin: The Basics',
    'understanding-bitcoin-basics',
    E'# Understanding Bitcoin: The Basics\n\n## Introduction\n\nBitcoin is a decentralized digital currency that was created in 2009 by an unknown person or group using the pseudonym Satoshi Nakamoto. Unlike traditional currencies, Bitcoin operates without a central authority or banks managing transactions.\n\n## How Bitcoin Works\n\nBitcoin works on a technology called blockchain, which is a distributed ledger enforced by a network of computers. All Bitcoin transactions are recorded on this public ledger, making it transparent and resistant to fraud.\n\n### Key Components:\n\n1. **Blockchain**: A chain of blocks containing transaction data.\n2. **Mining**: The process by which new bitcoins are created and transactions are verified.\n3. **Wallets**: Software that allows users to store and manage their bitcoins.\n4. **Private Keys**: Secret codes that allow bitcoins to be spent.\n\n## Why Bitcoin Matters\n\nBitcoin represents a significant innovation in financial technology for several reasons:\n\n- **Decentralization**: No single entity controls Bitcoin.\n- **Limited Supply**: Only 21 million bitcoins will ever exist, making it resistant to inflation.\n- **Borderless Transactions**: Bitcoin can be sent anywhere in the world without intermediaries.\n- **Financial Inclusion**: Provides banking-like services to the unbanked population.\n\n## Getting Started with Bitcoin\n\nTo start using Bitcoin, you need:\n\n1. A Bitcoin wallet\n2. A way to buy or earn bitcoins\n3. Understanding of security practices\n\n## Conclusion\n\nWhile Bitcoin has its challenges, including price volatility and regulatory concerns, it has established itself as a pioneering technology that continues to evolve and influence the global financial landscape.',
    'An introduction to Bitcoin, explaining its fundamental concepts, how it works, and why it matters in the modern financial landscape.',
    'Satoshi Nakamoto',
    8,
    '/images/articles/bitcoin-basics.jpg',
    ARRAY['Bitcoin', 'Blockchain', 'Cryptocurrency', 'Beginner']
  ),
  (
    'Smart Contracts: The Future of Digital Agreements',
    'smart-contracts-future-digital-agreements',
    E'# Smart Contracts: The Future of Digital Agreements\n\n## What Are Smart Contracts?\n\nSmart contracts are self-executing contracts with the terms directly written into code. They automatically enforce and execute the terms of an agreement when predetermined conditions are met, without the need for intermediaries.\n\n## How Smart Contracts Work\n\nSmart contracts operate on blockchain platforms, with Ethereum being the most popular. When deployed on a blockchain, smart contracts become immutable and transparent.\n\n### Key Features:\n\n1. **Automation**: Execute automatically when conditions are met\n2. **Transparency**: Visible to all parties involved\n3. **Immutability**: Cannot be altered once deployed\n4. **Efficiency**: Reduce the need for intermediaries\n\n## Real-World Applications\n\nSmart contracts are revolutionizing various industries:\n\n### Finance\n- Automated lending and borrowing\n- Insurance claim processing\n- Decentralized exchanges\n\n### Supply Chain\n- Tracking product provenance\n- Automating payments to suppliers\n- Verifying authenticity of goods\n\n### Real Estate\n- Automating property transfers\n- Rent payments and agreements\n- Escrow services\n\n## Challenges and Limitations\n\nDespite their potential, smart contracts face several challenges:\n\n- **Code Vulnerabilities**: Bugs can lead to significant financial losses\n- **Legal Recognition**: Varying legal status across jurisdictions\n- **Oracle Problem**: Reliance on external data sources\n- **Scalability**: Performance limitations on current blockchains\n\n## The Future of Smart Contracts\n\nAs blockchain technology evolves, smart contracts are expected to become more sophisticated and widely adopted. Improvements in scalability, interoperability, and legal frameworks will likely accelerate their adoption.\n\n## Conclusion\n\nSmart contracts represent a fundamental shift in how agreements are created, executed, and enforced. While challenges remain, their potential to increase efficiency, reduce costs, and create new business models makes them one of the most promising applications of blockchain technology.',
    'An exploration of smart contracts, their functionality, real-world applications, challenges, and future potential in transforming digital agreements.',
    'Vitalik Buterin',
    10,
    '/images/articles/smart-contracts.jpg',
    ARRAY['Smart Contracts', 'Ethereum', 'Blockchain', 'DeFi']
  ),
  (
    'Blockchain Security: Best Practices for Protection',
    'blockchain-security-best-practices',
    E'# Blockchain Security: Best Practices for Protection\n\n## Introduction\n\nBlockchain technology offers inherent security benefits through its distributed and immutable nature. However, various security vulnerabilities can still affect blockchain systems, particularly at the application and user levels.\n\n## Common Security Vulnerabilities\n\n### Smart Contract Vulnerabilities\n\n1. **Reentrancy Attacks**: When a function makes an external call before resolving its effects, allowing attackers to recursively call back into the original function.\n\n2. **Integer Overflow/Underflow**: Occurs when arithmetic operations exceed the maximum or minimum size of an integer type.\n\n3. **Access Control Issues**: Improper implementation of access controls can allow unauthorized actions.\n\n### Wallet Security Issues\n\n1. **Private Key Management**: Loss or theft of private keys can result in permanent loss of assets.\n\n2. **Phishing Attacks**: Deceptive attempts to steal user credentials or private keys.\n\n3. **Malware**: Software designed to compromise wallet security.\n\n## Best Practices for Blockchain Security\n\n### For Developers\n\n1. **Code Audits**: Have smart contracts audited by reputable security firms.\n\n2. **Formal Verification**: Use mathematical methods to prove code correctness.\n\n3. **Follow Established Patterns**: Use well-tested libraries and design patterns.\n\n4. **Rate Limiting**: Implement mechanisms to prevent rapid, repeated transactions.\n\n5. **Comprehensive Testing**: Include edge cases and potential attack scenarios.\n\n### For Users\n\n1. **Hardware Wallets**: Store significant assets in hardware wallets.\n\n2. **Multi-Signature Wallets**: Require multiple keys to authorize transactions.\n\n3. **Regular Updates**: Keep software wallets and applications updated.\n\n4. **Verify Addresses**: Always double-check recipient addresses before sending transactions.\n\n5. **Backup Recovery Phrases**: Store seed phrases securely in multiple locations.\n\n## Emerging Security Solutions\n\n1. **Zero-Knowledge Proofs**: Allow verification without revealing underlying information.\n\n2. **Secure Multi-Party Computation**: Enable collaborative computation while keeping inputs private.\n\n3. **Formal Verification Tools**: Specialized tools to mathematically verify smart contract security.\n\n## Conclusion\n\nBlockchain security requires vigilance at multiple levels. By understanding common vulnerabilities and implementing best practices, both developers and users can significantly reduce security risks. As the technology evolves, security measures will continue to advance, but the fundamental principles of careful development and prudent user behavior remain essential.',
    'A comprehensive guide to blockchain security vulnerabilities and best practices for developers and users to protect their assets and applications.',
    'Dr. Security Expert',
    12,
    '/images/articles/blockchain-security.jpg',
    ARRAY['Security', 'Blockchain', 'Cryptocurrency', 'Best Practices']
  ),
  (
    'The Rise of DeFi: Decentralized Finance Explained',
    'rise-of-defi-explained',
    E'# The Rise of DeFi: Decentralized Finance Explained\n\n## What is DeFi?\n\nDecentralized Finance, or DeFi, refers to financial applications built on blockchain technology that aim to recreate and improve upon traditional financial systems without centralized intermediaries like banks or brokerages.\n\n## Core Components of DeFi\n\n### 1. Decentralized Exchanges (DEXs)\n\nDEXs like Uniswap and SushiSwap allow users to trade cryptocurrencies directly with one another without a central authority. They typically use automated market makers (AMMs) to determine prices based on mathematical formulas.\n\n### 2. Lending and Borrowing Platforms\n\nPlatforms like Aave and Compound enable users to lend their crypto assets to earn interest or borrow assets by providing collateral, all without traditional credit checks or intermediaries.\n\n### 3. Stablecoins\n\nCryptocurrencies pegged to the value of traditional assets (usually the US dollar), such as DAI, USDC, and USDT, provide stability in the volatile crypto market and serve as the backbone for many DeFi applications.\n\n### 4. Yield Farming\n\nThe practice of staking or lending crypto assets to generate returns, often by providing liquidity to DEXs or lending platforms in exchange for rewards.\n\n### 5. Insurance Protocols\n\nServices like Nexus Mutual that provide coverage against smart contract failures, hacks, or other DeFi-specific risks.\n\n## Advantages of DeFi\n\n1. **Accessibility**: Anyone with an internet connection can access DeFi services without approval from centralized gatekeepers.\n\n2. **Transparency**: All transactions and rules are visible on the blockchain.\n\n3. **Interoperability**: DeFi applications can be combined like "money legos" to create new financial products.\n\n4. **Non-custodial**: Users maintain control of their assets rather than trusting them to a third party.\n\n5. **Programmability**: Financial services can be automated and customized through smart contracts.\n\n## Risks and Challenges\n\n1. **Smart Contract Vulnerabilities**: Code bugs can lead to significant financial losses.\n\n2. **Scalability Issues**: High transaction fees and slow confirmation times during network congestion.\n\n3. **Regulatory Uncertainty**: Unclear or evolving regulations across different jurisdictions.\n\n4. **User Experience**: Complex interfaces and technical knowledge requirements create barriers to entry.\n\n5. **Market Volatility**: Price fluctuations can impact collateralization ratios and trigger liquidations.\n\n## The Future of DeFi\n\nDeFi continues to evolve rapidly, with innovations addressing current limitations:\n\n- **Layer 2 Solutions**: Technologies like Optimistic Rollups and zk-Rollups aim to improve scalability.\n\n- **Cross-Chain Compatibility**: Projects working to enable DeFi across multiple blockchains.\n\n- **Improved User Interfaces**: More intuitive applications to attract mainstream users.\n\n- **Institutional Adoption**: Growing interest from traditional financial institutions.\n\n## Conclusion\n\nDeFi represents a fundamental shift in how financial services can be delivered and accessed. While still in its early stages with significant risks, its potential to create a more open, efficient, and inclusive financial system makes it one of the most exciting applications of blockchain technology today.',
    'An overview of Decentralized Finance (DeFi), exploring its key components, advantages, risks, and future potential in reshaping the financial landscape.',
    'Finance Innovator',
    15,
    '/images/articles/defi-explained.jpg',
    ARRAY['DeFi', 'Finance', 'Cryptocurrency', 'Ethereum']
  )
ON CONFLICT (slug) DO NOTHING;

-- Create API function to get articles with pagination
CREATE OR REPLACE FUNCTION get_articles(
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0,
  p_tag TEXT DEFAULT NULL,
  p_warrior_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_articles JSONB;
  v_total_count INTEGER;
BEGIN
  -- Get total count for pagination
  IF p_tag IS NULL THEN
    SELECT COUNT(*) INTO v_total_count FROM articles;
  ELSE
    SELECT COUNT(*) INTO v_total_count FROM articles WHERE p_tag = ANY(tags);
  END IF;
  
  -- Get articles with read status if warrior_id is provided
  IF p_warrior_id IS NOT NULL THEN
    WITH article_data AS (
      SELECT 
        a.id,
        a.title,
        a.slug,
        a.summary,
        a.author,
        a.published_at,
        a.reading_time_minutes,
        a.banner_url,
        a.tags,
        CASE 
          WHEN ar.completed THEN 'completed'
          WHEN ar.read_percentage > 0 THEN 'in_progress'
          ELSE 'unread'
        END as read_status,
        COALESCE(ar.read_percentage, 0) as read_percentage
      FROM articles a
      LEFT JOIN article_reads ar ON a.id = ar.article_id AND ar.warrior_id = p_warrior_id
      WHERE p_tag IS NULL OR p_tag = ANY(a.tags)
      ORDER BY a.published_at DESC
      LIMIT p_limit
      OFFSET p_offset
    )
    SELECT jsonb_agg(to_jsonb(article_data))
    INTO v_articles
    FROM article_data;
  ELSE
    -- Get articles without read status
    WITH article_data AS (
      SELECT 
        a.id,
        a.title,
        a.slug,
        a.summary,
        a.author,
        a.published_at,
        a.reading_time_minutes,
        a.banner_url,
        a.tags,
        'unread' as read_status,
        0 as read_percentage
      FROM articles a
      WHERE p_tag IS NULL OR p_tag = ANY(a.tags)
      ORDER BY a.published_at DESC
      LIMIT p_limit
      OFFSET p_offset
    )
    SELECT jsonb_agg(to_jsonb(article_data))
    INTO v_articles
    FROM article_data;
  END IF;
  
  -- Handle empty results
  IF v_articles IS NULL THEN
    v_articles := '[]'::jsonb;
  END IF;
  
  -- Return results with pagination info
  RETURN jsonb_build_object(
    'articles', v_articles,
    'total_count', v_total_count,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$$;

-- Create API function to get a single article with read status
CREATE OR REPLACE FUNCTION get_article_by_slug(
  p_slug TEXT,
  p_warrior_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_article articles%ROWTYPE;
  v_read_status article_reads%ROWTYPE;
  v_result JSONB;
BEGIN
  -- Get the article
  SELECT * INTO v_article FROM articles WHERE slug = p_slug;
  
  IF v_article.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Article not found');
  END IF;
  
  -- Get read status if warrior_id is provided
  IF p_warrior_id IS NOT NULL THEN
    SELECT * INTO v_read_status 
    FROM article_reads 
    WHERE article_id = v_article.id AND warrior_id = p_warrior_id;
    
    v_result := jsonb_build_object(
      'id', v_article.id,
      'title', v_article.title,
      'slug', v_article.slug,
      'content', v_article.content,
      'summary', v_article.summary,
      'author', v_article.author,
      'published_at', v_article.published_at,
      'reading_time_minutes', v_article.reading_time_minutes,
      'banner_url', v_article.banner_url,
      'tags', v_article.tags,
      'read_status', CASE 
        WHEN v_read_status.completed THEN 'completed'
        WHEN v_read_status.read_percentage > 0 THEN 'in_progress'
        ELSE 'unread'
      END,
      'read_percentage', COALESCE(v_read_status.read_percentage, 0),
      'xp_earned', COALESCE(v_read_status.xp_earned, 0)
    );
  ELSE
    -- Return article without read status
    v_result := jsonb_build_object(
      'id', v_article.id,
      'title', v_article.title,
      'slug', v_article.slug,
      'content', v_article.content,
      'summary', v_article.summary,
      'author', v_article.author,
      'published_at', v_article.published_at,
      'reading_time_minutes', v_article.reading_time_minutes,
      'banner_url', v_article.banner_url,
      'tags', v_article.tags,
      'read_status', 'unread',
      'read_percentage', 0,
      'xp_earned', 0
    );
  END IF;
  
  RETURN v_result;
END;
$$;
