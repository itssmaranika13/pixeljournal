export default function SignUp() {
  const pageStyle = {
    background: "#ffffff",
    color: "#000000",
    minHeight: "100vh",
    boxSizing: "border-box",
    padding: "24px 12px",
    fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
  };

  const containerStyle = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    textAlign: "center",
  };

  return (
    <div style={pageStyle}>
      <h1 style={{ margin: "0 0 21px 0" }}>Oops! This page is unavailable.</h1>
      <hr style={{ border: "none", borderTop: "1px solid #999", margin: "0 0 40px 0" }} />

      <div style={containerStyle}>
        <img src="/image.png" alt="batman_cute" style={{ maxWidth: "100%", height: "auto" }} />
        <br />
        The feature you are looking for is currently unavailable. We apologise
        for the inconvenience. Please try again later.
      </div>
    </div>
  );
}