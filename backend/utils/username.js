async function createStudentUsername(pool) {
  const year = new Date().getFullYear() + 543;
  const yearSuffix = String(year).substring(2, 4);
  const [rows] = await pool.query(
    "SELECT username FROM User WHERE username LIKE ? ORDER BY username DESC LIMIT 1",
    [yearSuffix + '%']
  );
  let nextNum = 1;
  if (rows.length > 0) {
    const numPart = rows[0].username.substring(2);
    nextNum = parseInt(numPart, 10) + 1;
  }
  return yearSuffix + String(nextNum).padStart(3, '0');
}

module.exports = { createStudentUsername };
