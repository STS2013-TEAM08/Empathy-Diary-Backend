jest.mock("../models/post");

const Post = require("../models/post");

const { postDiary, getAllDiaries, getDiaryById, modifyDiaryContent, deleteDiary, getDiariesForSpecificPeriod } = require("./post");

// [p-01] 모든 일기 조회
describe("[p-01] getAllDiaries", () => {
    const req = {
        user: {
            id: 1,
        },
    };
    const res = {
        status: jest.fn(() => res),
        json: jest.fn(),
    };
    const next = jest.fn();

    test("사용자가 작성한 일기가 없으면 빈 리스트를 반환한다.", async () => {
        Post.findAll.mockReturnValue(Promise.resolve([]));

        await getAllDiaries(req, res, next);

        expect(res.status).toBeCalledWith(200);
        expect(res.json).toBeCalledWith({ diaries: [] });
    });

    test("사용자가 작성한 일기가 있으면 모든 일기 정보를 반환한다.", async () => {
        const result = [
            {
                dataValues: {
                    id: 1,
                    content: '일기 1',
                    createdAt: new Date("2024-04-28T00:00:26.000Z"),
                },
            },
            {
                dataValues: {
                    id: 2,
                    content: '일기 2',
                    createdAt: new Date("2024-04-29T00:30:26.000Z"),
                },
            },
            {
                dataValues: {
                    id: 3,
                    content: '일기 3',
                    createdAt: new Date("2024-04-30T01:00:26.000Z"),
                },
            },
        ];
        
        let diaries = [];

        const dateOptions = {
            year: 'numeric', month: '2-digit', day: '2-digit',
            timeZone: 'Asia/Seoul', // 한국 시간대 설정
        };
        const timeOptions = {
            hour: '2-digit', minute: '2-digit',
            timeZone: 'Asia/Seoul', // 한국 시간대 설정
            hour12: false // 24시간 표기법 사용
        }
        
        result.forEach((diary) => {

            diaries.push({
                id: diary.dataValues.id,
                content: diary.dataValues.content,
                writeDate: (diary.dataValues.createdAt).toLocaleString("ko-KR", dateOptions),
                writeTime: (diary.dataValues.createdAt).toLocaleString("ko-KR", timeOptions),
            });
        });

        Post.findAll.mockReturnValue(Promise.resolve(result));

        await getAllDiaries(req, res, next);

        expect(res.status).toBeCalledWith(200);
        expect(res.json).toBeCalledWith({ diaries });
    });

    test("데이터베이스 에러 발생 시 next(error)를 호출한다.", async () => {
        const error = new Error("데이터베이스 조회 중 에러가 발생했습니다.");
        Post.findAll.mockReturnValue(Promise.reject(error));

        await getAllDiaries(req, res, next);

        expect(next).toBeCalledWith(error);
    });
});

// [p-02] 특정 일기 조회
describe("[p-02] getDiaryById", () => {
    const req = {
        params: {
            postId: 1,
        },
        user: {
            id: 1,
        },
    };
    const res = {
        status: jest.fn(() => res),
        send: jest.fn(),
        json: jest.fn(),
    };
    const next = jest.fn();

    test("일기가 조회되고, 작성자와 사용자의 ID가 일치한다면 일기 조회에 성공한다.", async () => {
        const result = {
            id: 1,
            content: "일기",
            createdAt: new Date("2024-04-28T00:00:26.000Z"),
            writer: 1,      // req.params.id === 1
        };
        Post.findOne.mockReturnValue(Promise.resolve(result));

        await getDiaryById(req, res, next);

        const dateOptions = {
            year: 'numeric', month: '2-digit', day: '2-digit',
            timeZone: 'Asia/Seoul', // 한국 시간대 설정
        };
        const timeOptions = {
            hour: '2-digit', minute: '2-digit',
            timeZone: 'Asia/Seoul', // 한국 시간대 설정
            hour12: false // 24시간 표기법 사용
        };

        const diary = {
            id: result.id,
            content: result.content,
            writeDate: (result.createdAt).toLocaleString("ko-KR", dateOptions),
            writeTime: (result.createdAt).toLocaleString("ko-KR", timeOptions),
        };

        expect(res.status).toBeCalledWith(200);
        expect(res.json).toBeCalledWith({ diary });
    });

    test("URL 경로에 전달된 것이 쿼리 파라미터가 아닌 다른 값이라면 next()를 반환한다.", async () => {
        const req = {
            params: {
                postId: "period",       //GET /posts/period 
            },
        };

        await getDiaryById(req, res, next);

        expect(next).toBeCalledTimes(1);
    });

    test("데이터베이스에서 일기가 조회되지 않으면 일기 조회에 실패한다.", async () => {
        Post.findOne.mockReturnValue(Promise.resolve(null));

        await getDiaryById(req, res, next);

        expect(res.status).toBeCalledWith(404);
        expect(res.send).toBeCalledWith(`[id: ${req.params.postId}] 일기가 존재하지 않습니다.`);
    });

    test("일기 작성자와 사용자의 ID가 일치하지 않으면 일기 조회에 실패한다.", async () => {
        Post.findOne.mockReturnValue(Promise.resolve({
            writer: 2,      // req.params.id === 1
        }));

        await getDiaryById(req, res, next);

        expect(res.status).toBeCalledWith(403);
        expect(res.send).toBeCalledWith("접근 권한이 없습니다.");
    });

    test("데이터베이스 조회 중 에러가 발생하면 next(error)를 호출한다.", async () => {
        const error = new Error("데이터베이스 조회 중 에러가 발생하였습니다.");
        Post.findOne.mockReturnValue(Promise.reject(error));

        await getDiaryById(req, res, next);

        expect(next).toBeCalledWith(error);
    })
});

// [p-03] 일기 등록
describe("[p-03] postDiary", () => {
    const res = {
        status: jest.fn(() => res),
        send: jest.fn(),
    };
    const next = jest.fn();

    test("일기 내용이 존재하면 일기를 등록한다.", async () => {
        const req = {
            body: {
                content: "일기의 내용입니다.",
            },
            user: {
                id: 1,
            },
        };
        Post.create.mockReturnValue(Promise.resolve(true));

        await postDiary(req, res, next);

        expect(res.status).toBeCalledWith(200);
        expect(res.send).toBeCalledWith("일기가 작성되었습니다.");
    });

    test("일기 내용이 존재하지 않으면 일기 등록에 실패한다.", async () => {
        const req = {
            body: {
                content: '',
            },
            user: {
                id: 1,
            },
        };
        
        await postDiary(req, res, next);

        expect(res.status).toBeCalledWith(400);
        expect(res.send).toBeCalledWith("일기 내용이 존재하지 않습니다.");
    });

    test("데이터베이스 에러 발생 시 next(error)를 호출한다.", async () => {
        const req = {
            body: {
                content: "일기의 내용입니다.",
            },
            user: {
                id: 1,
            },
        };

        const error = new Error("데이터베이스 생성 작업 중 오류가 발생했습니다.");
        Post.create.mockReturnValue(Promise.reject(error));

        await postDiary(req, res, next);

        expect(next).toBeCalledWith(error);
    });
});

// [p-04] 일기 내용 수정
describe("[p-04] modifyDiaryContent", () => {
    const res = {
        status: jest.fn(() => res),
        send: jest.fn(),
    };
    const next = jest.fn();

    test("요청 바디에 속성이 존재하지 않으면 서버 에러가 발생한다.", async () => {
        const req = {
            body: {
            },
        };

        await modifyDiaryContent(req, res, next);

        expect(next).toBeCalledTimes(1);
    });

    test("새로운 일기의 내용이 빈 문자열이면 일기 내용 수정에 실패한다.", async () => {
        const req = {
            body: {
                postId: 1,
                newContent: '',
            },
        };

        await modifyDiaryContent(req, res, next);

        expect(res.status).toBeCalledWith(400);
        expect(res.send).toBeCalledWith("일기 내용이 존재하지 않습니다.");
    });

    test("데이터베이스 조회 중 에러가 발생하면 next(error)가 호출된다.", async () => {
        const req = {
            body: {
                postId: 1,
                newContent: "새로운 내용입니다.",
            },
        };
        
        const error = new Error("데이터베이스 조회 작업 중 에러가 발생하였습니다.");
        Post.findOne.mockReturnValue(Promise.reject(error));

        await modifyDiaryContent(req, res, next);

        expect(next).toBeCalledWith(error);
    });

    test("데이터베이스에서 조회된 일기가 없으면 일기 내용 수정에 실패한다.", async () => {
        const req = {
            body: {
                postId: 1,
                newContent: "새로운 내용입니다.",
            },
        };

        Post.findOne.mockReturnValue(Promise.resolve(null));

        await modifyDiaryContent(req, res, next);

        expect(res.status).toBeCalledWith(404);
        expect(res.send).toBeCalledWith(`[id: ${req.body.postId}] 일기가 존재하지 않습니다.`);
    });

    test("일기의 작성자가 일치하지 않으면 일기 내용 수정에 실패한다.", async () => {
        const req = {
            body: {
                postId: 1,
                newContent: "새로운 내용입니다.",
            },
            user: {
                id: 1,
            }
        };

        const post = {
            writer: 2,      // req.user.id === 1
        };
        Post.findOne.mockReturnValue(Promise.resolve(post));

        await modifyDiaryContent(req, res, next);

        expect(res.status).toBeCalledWith(403);
        expect(res.send).toBeCalledWith("접근 권한이 없습니다.");
    });

    test("수정될 내용이 없으면 일기 내용 수정에 실패한다.", async () => {
        const req = {
            body: {
                postId: 1,
                newContent: "새로운 내용입니다.",
            },
            user: {
                id: 1,
            }
        };

        const post = {
            writer: 1,      // req.user.id === 1
            content: req.body.newContent,
        };
        Post.findOne.mockReturnValue(Promise.resolve(post));

        await modifyDiaryContent(req, res, next);

        expect(res.status).toBeCalledWith(400);
        expect(res.send).toBeCalledWith("수정될 내용이 없습니다.");
    });

    test("데이터베이스 저장 중 에러가 발생하면 next(error)가 호출된다.", async () => {
        const req = {
            body: {
                postId: 1,
                newContent: "새로운 내용입니다.",
            },
            user: {
                id: 1,
            }
        };

        const error = new Error("데이터베이스 저장 작업 중 에러가 발생하였습니다.");
        const post = {
            writer: 1,      // req.user.id === 1
            content: "기존의 내용입니다.",
            save: jest.fn(() => Promise.reject(error)),
        };
        Post.findOne.mockReturnValue(Promise.resolve(post));

        await modifyDiaryContent(req, res, next);

        expect(next).toBeCalledWith(error);
    });

    test("데이터베이스 작업 중 에러가 발생하지 않고 같은 사용자의 일기 내용에 수정 사항이 있으면 일기 내용 수정에 성공한다.", async () => {
        const req = {
            body: {
                postId: 1,
                newContent: "새로운 내용입니다.",
            },
            user: {
                id: 1,
            }
        };

        const post = {
            writer: 1,      // req.user.id === 1
            content: "기존의 내용입니다.",
            save: jest.fn(() => Promise.resolve(true)),
        };
        Post.findOne.mockReturnValue(Promise.resolve(post));

        await modifyDiaryContent(req, res, next);

        expect(res.status).toBeCalledWith(200);
        expect(res.send).toBeCalledWith("일기 내용을 수정했습니다.");
    });
});

// [p-05] 일기 삭제
describe("[p-05] deleteDiary", () => {
    const res = {
        status: jest.fn(() => res),
        send: jest.fn(),
    };
    const next = jest.fn();

    test("데이터베이스 작업 중 문제가 없고, 같은 사용자의 일기에 대한 삭제 요청이 들어오면 일기 삭제에 성공한다.", async () => {
        const req = {
            params: {
                postId: 1,
            },
            user: {
                id: 1,
            },
        };

        const post = {
            writer: 1,      // req.user.id === 1
            destroy: jest.fn(() => Promise.resolve(true)),
        }
        Post.findOne.mockReturnValue(Promise.resolve(post));

        await deleteDiary(req, res, next);

        expect(res.status).toBeCalledWith(200);
        expect(res.send).toBeCalledWith("일기가 삭제되었습니다.");
    });

    test("데이터베이스 조회 중 에러가 발생하면 next(error)를 호출한다.", async () => {
        const req = {
            params: {
                postId: 1,
            },
        };

        const error = new Error("데이터베이스 조회 중 에러가 발생하였습니다.");
        Post.findOne.mockReturnValue(Promise.reject(error));

        await deleteDiary(req, res, next);

        expect(next).toBeCalledWith(error);
    });

    test("데이터베이스 조회 결과가 존재하지 않으면 일기 삭제에 실패한다.", async () => {
        const req = {
            params: {
                postId: 1,
            },
        };

        Post.findOne.mockReturnValue(Promise.resolve(null));

        await deleteDiary(req, res, next);

        expect(res.status).toBeCalledWith(404);
        expect(res.send).toBeCalledWith(`[ID: ${req.params.postId}] 일기가 존재하지 않습니다.`);
    });

    test("일기 작성자와 삭제를 요청한 사용자가 일치하지 않으면 일기 삭제에 실패한다.", async () => {
        const req = {
            params: {
                postId: 1,
            },
            user: {
                id: 1,
            },
        };

        const post = {
            writer: 2,      // req.user.id === 1
        }
        Post.findOne.mockReturnValue(Promise.resolve(post));

        await deleteDiary(req, res, next);

        expect(res.status).toBeCalledWith(403);
        expect(res.send).toBeCalledWith("접근 권한이 없습니다.");
    });

    test("데이터베이스 삭제 중 에러가 발생하면 next(error)를 호출한다.", async () => {
        const req = {
            params: {
                postId: 1,
            },
            user: {
                id: 1,
            },
        };

        const error = new Error("데이터베이스 삭제 중 에러가 발생했습니다.");
        const post = {
            writer: 1,      // req.user.id === 1
            destroy: jest.fn(() => Promise.reject(error)),
        }
        Post.findOne.mockReturnValue(Promise.resolve(post));

        await deleteDiary(req, res, next);

        expect(next).toBeCalledWith(error);
    });
});

// [p-06] 특정 기간 일기 조회
describe("[p-06] getDiariesForSpecificPeriod", () => {
    const res = {
        status: jest.fn(() => res),
        json: jest.fn(),
        send: jest.fn(),
    };
    const next = jest.fn();

    test("해당 기간 동안 작성한 게시글이 존재하면 일기 조회에 성공한다.", async () => {
        const req = {
            query: {
                startDate: new Date("2024-04-28"),
                endDate: new Date("2024-05-01"),
            },
            user: {
                id: 1,
            },
        };

        const result = [
            {
                dataValues: {
                    id: 1,
                    content: '일기 1',
                    createdAt: new Date("2024-04-28T00:00:26.000Z"),
                },
            },
            {
                dataValues: {
                    id: 2,
                    content: '일기 2',
                    createdAt: new Date("2024-04-29T00:30:26.000Z"),
                },
            },
            {
                dataValues: {
                    id: 3,
                    content: '일기 3',
                    createdAt: new Date("2024-04-30T01:00:26.000Z"),
                },
            },
        ];

        Post.findAll.mockReturnValue(Promise.resolve(result));

        await getDiariesForSpecificPeriod(req, res, next);
        
        let diaries = [];

        const dateOptions = {
            year: 'numeric', month: '2-digit', day: '2-digit',
            timeZone: 'Asia/Seoul', // 한국 시간대 설정
        };
        const timeOptions = {
            hour: '2-digit', minute: '2-digit',
            timeZone: 'Asia/Seoul', // 한국 시간대 설정
            hour12: false // 24시간 표기법 사용
        }
        
        result.forEach((diary) => {

            diaries.push({
                id: diary.dataValues.id,
                content: diary.dataValues.content,
                writeDate: (diary.dataValues.createdAt).toLocaleString("ko-KR", dateOptions),
                writeTime: (diary.dataValues.createdAt).toLocaleString("ko-KR", timeOptions),
            });
        });

        expect(res.status).toBeCalledWith(200);
        expect(res.json).toBeCalledWith({ diaries });
    });

    test("해당 기간 동안 작성한 게시글이 존재하지 않으면 빈 리스트를 반환하고 일기 조회에 성공한다.", async () => {
        const req = {
            query: {
                startDate: new Date(),
                endDate: new Date(),
            },
            user: {
                id: 1,
            },
        };

        Post.findAll.mockReturnValue(Promise.resolve([]));

        await getDiariesForSpecificPeriod(req, res, next);

        expect(res.status).toBeCalledWith(200);
        expect(res.json).toBeCalledWith({ diaries: [] });
    });

    test("쿼리 파라미터가 존재하지 않으면 일기 조회에 실패한다.", async () => {
        const req = {
            query: {},
        };

        await getDiariesForSpecificPeriod(req, res, next);

        expect(res.status).toBeCalledWith(400);
        expect(res.send).toBeCalledWith("충분한 쿼리 파라미터가 제공되지 않았습니다.");
    });

    test("쿼리 파라미터가 Date 객체로 파싱이 불가능하면 일기 조회에 실패한다.", async () => {
        const req = {
            query: {
                startDate: "Cannot Parse",
                endDate: "Cannot Parse",
            },
        };

        await getDiariesForSpecificPeriod(req, res, next);

        expect(res.status).toBeCalledWith(400);
        expect(res.send).toBeCalledWith("쿼리 파라미터의 값이 유효하지 않습니다.");
    });

    test("데이터베이스 조회 중 에러가 발생하면 next(error)를 호출한다.", async () => {
        const req = {
            query: {
                startDate: new Date(),
                endDate: new Date(),
            },
            user: {
                id: 1,
            },
        };

        const error = new Error("데이터베이스 조회 중 에러가 발생하였습니다.");
        Post.findAll.mockReturnValue(Promise.reject(error));

        await getDiariesForSpecificPeriod(req, res, next);

        expect(next).toBeCalledWith(error);
    });
});