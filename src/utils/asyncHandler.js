const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export default asyncHandler;

/*
const asyncHandler = () =>{}
const asyncHandler = (func) =>() => {}
const asyncHandle = (func) => async () =>{}
*/

// ata holo async wala code
/*
const asyncHandler = (fn) => async (req, res, next) => { 
    try {
      await fn(req, res, next)
    } catch (error) {
      res.status(error.code || 5000).json({
        success: false,
        message: error.message
      })
    }
  }
  
export default asyncHandler;
*/
