SELECT
  s_suppkey,
  s_name,
  s_address,
  s_phone,
  total_revenue
FROM
  supplier,
  (
    SELECT
      l_suppkey AS supplier_no,
      sum(l_extendedprice * (1 - l_discount)) AS total_revenue
    FROM
      lineitem
    WHERE
      l_shipdate >= '1996-01-01'
      AND l_shipdate < '1996-04-01'
    GROUP BY
      supplier_no
  ) revenue0
WHERE
  s_suppkey = supplier_no
  AND total_revenue = (
    SELECT
      max(total_revenue)
    FROM
      (
        SELECT
          l_suppkey AS supplier_no,
          sum(l_extendedprice * (1 - l_discount)) AS total_revenue
        FROM
          lineitem
        WHERE
          l_shipdate >= '1996-01-01'
          AND l_shipdate < '1996-04-01'
        GROUP BY
          supplier_no
      ) revenue1
  )
ORDER BY
  s_suppkey;
