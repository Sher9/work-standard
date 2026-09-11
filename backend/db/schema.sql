-- 金融知识库管理系统 Schema
-- 幂等初始化：仅在不存在的表时创建

CREATE TABLE IF NOT EXISTS category (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  parent_id   INTEGER REFERENCES category(id) ON DELETE RESTRICT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  icon        VARCHAR(100),
  level       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS file_meta (
  id         SERIAL PRIMARY KEY,
  filename   VARCHAR(255) NOT NULL,
  path       VARCHAR(500) NOT NULL,
  mime_type  VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document (
  id           SERIAL PRIMARY KEY,
  category_id  INTEGER REFERENCES category(id) ON DELETE RESTRICT,
  title        VARCHAR(255) NOT NULL,
  content_html TEXT NOT NULL DEFAULT '',
  tags         TEXT NOT NULL DEFAULT '',
  author_id    VARCHAR(50),
  file_id      INTEGER REFERENCES file_meta(id) ON DELETE SET NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  read_count   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doc_version (
  id               SERIAL PRIMARY KEY,
  document_id      INTEGER NOT NULL REFERENCES document(id) ON DELETE CASCADE,
  version_no       INTEGER NOT NULL,
  content_snapshot TEXT NOT NULL DEFAULT '',
  change_summary   TEXT NOT NULL DEFAULT '',
  editor_id        VARCHAR(50),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, version_no)
);

-- 文档状态扩展：在原有 草稿/已发布/已归档 之上增加审核流转状态
ALTER TABLE document DROP CONSTRAINT IF EXISTS document_status_check;
ALTER TABLE document
  ADD CONSTRAINT document_status_check
  CHECK (status IN ('draft','pending','approved','rejected','completed','published','archived'));

-- 文档状态流转记录：每次状态变化都留下处理意见
CREATE TABLE IF NOT EXISTS document_status_log (
  id           SERIAL PRIMARY KEY,
  document_id  INTEGER NOT NULL REFERENCES document(id) ON DELETE CASCADE,
  from_status  VARCHAR(20),
  to_status    VARCHAR(20) NOT NULL,
  action       VARCHAR(20) NOT NULL,
  comment      TEXT NOT NULL DEFAULT '',
  operator_id  VARCHAR(50),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_document_status_log_doc
  ON document_status_log (document_id, created_at DESC);

CREATE TABLE IF NOT EXISTS favorite (
  id          SERIAL PRIMARY KEY,
  employee_no VARCHAR(50) NOT NULL,
  document_id INTEGER NOT NULL REFERENCES document(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_no, document_id)
);

-- 账户与角色：管理员(admin) 负责分类管理与文档维护；普通用户(user) 仅可使用文档列表/搜索/收藏
CREATE TABLE IF NOT EXISTS employee (
  employee_no VARCHAR(50) PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  password    VARCHAR(200) NOT NULL,
  role        VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 登录令牌：Bearer Token 持久化，便于吊销与过期校验
CREATE TABLE IF NOT EXISTS auth_token (
  token       VARCHAR(100) PRIMARY KEY,
  employee_no VARCHAR(50) NOT NULL REFERENCES employee(employee_no) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_token_emp ON auth_token (employee_no);

-- ============================================================
-- 示例数据（幂等：已存在则跳过，重复启动不会重复插入）
-- 说明：演示账户（E10001 管理员 / E10002 普通用户）由启动时的
--       auth.service.seedEmployees() 写入（密码为 scrypt 哈希），
--       此处为保持密码安全不再重复维护，示例数据仅针对业务内容。
-- ============================================================

-- 分类目录树
INSERT INTO category (name, parent_id, sort_order, level)
SELECT '结算业务', NULL, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM category WHERE name = '结算业务' AND parent_id IS NULL);

INSERT INTO category (name, parent_id, sort_order, level)
SELECT '结算手册',
       (SELECT id FROM category WHERE name = '结算业务' AND parent_id IS NULL), 0, 1
WHERE NOT EXISTS (
  SELECT 1 FROM category
  WHERE name = '结算手册'
    AND parent_id = (SELECT id FROM category WHERE name = '结算业务' AND parent_id IS NULL)
);

INSERT INTO category (name, parent_id, sort_order, level)
SELECT '结算产品',
       (SELECT id FROM category WHERE name = '结算业务' AND parent_id IS NULL), 1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM category
  WHERE name = '结算产品'
    AND parent_id = (SELECT id FROM category WHERE name = '结算业务' AND parent_id IS NULL)
);

INSERT INTO category (name, parent_id, sort_order, level)
SELECT '贷款业务', NULL, 1, 0
WHERE NOT EXISTS (SELECT 1 FROM category WHERE name = '贷款业务' AND parent_id IS NULL);

INSERT INTO category (name, parent_id, sort_order, level)
SELECT '信贷政策',
       (SELECT id FROM category WHERE name = '贷款业务' AND parent_id IS NULL), 0, 1
WHERE NOT EXISTS (
  SELECT 1 FROM category
  WHERE name = '信贷政策'
    AND parent_id = (SELECT id FROM category WHERE name = '贷款业务' AND parent_id IS NULL)
);

INSERT INTO category (name, parent_id, sort_order, level)
SELECT '风险指引',
       (SELECT id FROM category WHERE name = '贷款业务' AND parent_id IS NULL), 1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM category
  WHERE name = '风险指引'
    AND parent_id = (SELECT id FROM category WHERE name = '贷款业务' AND parent_id IS NULL)
);

INSERT INTO category (name, parent_id, sort_order, level)
SELECT '制度法规', NULL, 2, 0
WHERE NOT EXISTS (SELECT 1 FROM category WHERE name = '制度法规' AND parent_id IS NULL);

INSERT INTO category (name, parent_id, sort_order, level)
SELECT '监管办法',
       (SELECT id FROM category WHERE name = '制度法规' AND parent_id IS NULL), 0, 1
WHERE NOT EXISTS (
  SELECT 1 FROM category
  WHERE name = '监管办法'
    AND parent_id = (SELECT id FROM category WHERE name = '制度法规' AND parent_id IS NULL)
);

-- 示例文档（引用上面创建的分类）
INSERT INTO document (category_id, title, content_html, tags, author_id, status, read_count)
SELECT c.id, '人民币结算业务操作手册',
       '<h3>第一章 总则</h3><p>本手册为人民币结算业务的操作指引，适用于全行柜面与对公结算人员。</p>',
       '结算,人民币,操作手册', 'E10001', 'published', 128
FROM category c
WHERE c.name = '结算手册' AND c.parent_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM document WHERE title = '人民币结算业务操作手册');

INSERT INTO document (category_id, title, content_html, tags, author_id, status, read_count)
SELECT c.id, '跨境结算业务流程',
       '<h3>流程概述</h3><p>跨境人民币结算业务需先完成客户准入、额度核定，再进入实时收付环节。</p>',
       '跨境,结算,流程', 'E10001', 'published', 86
FROM category c
WHERE c.name = '结算产品' AND c.parent_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM document WHERE title = '跨境结算业务流程');

INSERT INTO document (category_id, title, content_html, tags, author_id, status, read_count)
SELECT c.id, '小微企业信贷政策指引',
       '<h3>适用范围</h3><p>本指引适用于单户授信金额不超过1000万元的小微企业客户。</p>',
       '小微,信贷,政策', 'E10002', 'published', 203
FROM category c
WHERE c.name = '信贷政策' AND c.parent_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM document WHERE title = '小微企业信贷政策指引');

INSERT INTO document (category_id, title, content_html, tags, author_id, status, read_count)
SELECT c.id, '信贷业务风险防控要点',
       '<h3>风险要点</h3><p>贷前重点审查经营流水与还款来源，贷中关注资金流向合规性。</p>',
       '风控,信贷,风险', 'E10002', 'published', 95
FROM category c
WHERE c.name = '风险指引' AND c.parent_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM document WHERE title = '信贷业务风险防控要点');

INSERT INTO document (category_id, title, content_html, tags, author_id, status, read_count)
SELECT c.id, '反洗钱监管办法解读',
       '<h3>核心要求</h3><p>金融机构须建立客户身份识别、大额交易与可疑交易报告制度。</p>',
       '反洗钱,监管,法规', 'E10001', 'published', 156
FROM category c
WHERE c.name = '监管办法' AND c.parent_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM document WHERE title = '反洗钱监管办法解读');

-- 示例文档版本（为"人民币结算业务操作手册"建立版本历史）
INSERT INTO doc_version (document_id, version_no, content_snapshot, change_summary, editor_id)
SELECT d.id, 1, d.content_html, '初始版本', 'E10001'
FROM document d WHERE d.title = '人民币结算业务操作手册'
  AND NOT EXISTS (SELECT 1 FROM doc_version WHERE version_no = 1
                  AND document_id = (SELECT id FROM document WHERE title = '人民币结算业务操作手册'));

INSERT INTO doc_version (document_id, version_no, content_snapshot, change_summary, editor_id)
SELECT d.id, 2, d.content_html, '更新结算币种与费率章节', 'E10001'
FROM document d WHERE d.title = '人民币结算业务操作手册'
  AND NOT EXISTS (SELECT 1 FROM doc_version WHERE version_no = 2
                  AND document_id = (SELECT id FROM document WHERE title = '人民币结算业务操作手册'));

-- 示例收藏
INSERT INTO favorite (employee_no, document_id)
SELECT 'E10002', d.id FROM document d WHERE d.title = '人民币结算业务操作手册'
  AND NOT EXISTS (SELECT 1 FROM favorite f WHERE f.employee_no = 'E10002'
                  AND f.document_id = d.id);

INSERT INTO favorite (employee_no, document_id)
SELECT 'E10001', d.id FROM document d WHERE d.title = '小微企业信贷政策指引'
  AND NOT EXISTS (SELECT 1 FROM favorite f WHERE f.employee_no = 'E10001'
                  AND f.document_id = d.id);